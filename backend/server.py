from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------------- Config ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Deal Hunter AI API")
api = APIRouter(prefix="/api")

# ---------------- Helpers ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def slugify(text: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9\s-]', '', text.lower()).strip()
    return re.sub(r'[\s-]+', '-', s)[:80]

async def get_current_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(403, "Admin required")
    return user

# ---------------- Models ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

class SiteSettingsIn(BaseModel):
    site_name: str = "Deal Hunter AI"
    tagline: str = "Find Better Deals With AI"
    support_email: str = ""
    default_country: str = "US"
    default_currency: str = "USD"
    affiliate_disclosure: str = "As an affiliate, we may earn a commission from qualifying purchases."

class ProductIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: str = ""
    category: str
    image: str = ""
    price: float
    old_price: Optional[float] = None
    store: str = ""
    network: str = ""
    affiliate_url: str
    commission_pct: float = 5.0
    country: str = "US"
    currency: str = "USD"
    features: List[str] = []
    pros: List[str] = []
    cons: List[str] = []
    tags: List[str] = []
    featured: bool = False
    is_demo: bool = False
    status: Literal["active", "paused"] = "active"

class Product(ProductIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str = ""
    clicks: int = 0
    sales: int = 0
    revenue: float = 0.0
    commission_total: float = 0.0
    created_at: str = Field(default_factory=now_iso)

class NetworkIn(BaseModel):
    name: str
    account_id: str = ""
    tracking_id: str = ""
    country: str = "US"
    currency: str = "USD"
    api_status: str = "not_configured"
    feed_status: str = "not_configured"
    active: bool = True

class Network(NetworkIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=now_iso)

class DailyGoalIn(BaseModel):
    daily_sales_goal: int = 10
    growth_mode: Literal["conservative", "balanced", "aggressive"] = "balanced"

class SimulatorIn(BaseModel):
    desired_sales: int
    conversion_rate: float  # percent, e.g. 2.0
    avg_commission: float  # USD

class ContentGenIn(BaseModel):
    product_id: str
    content_type: Literal["description", "seo_article", "social_tiktok", "social_instagram",
                          "social_facebook", "social_pinterest", "social_x", "social_youtube_shorts",
                          "ad_ideas", "headlines", "cta"]

class AiSearchIn(BaseModel):
    query: str

class SubscribeIn(BaseModel):
    email: EmailStr

class PriceAlertIn(BaseModel):
    email: EmailStr
    product_id: str
    target_price: float

class BlogPublishIn(BaseModel):
    draft_id: str
    title: str
    meta_description: str = ""
    cover_image: str = ""

class FeedItemIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: str = ""
    category: str = "technology"
    image: str = ""
    price: float
    old_price: Optional[float] = None
    store: str = "Amazon"
    network: str = "Amazon Associates"
    affiliate_url: str
    commission_pct: float = 4.0
    country: str = "US"
    currency: str = "USD"
    features: List[str] = []

class FeedImportIn(BaseModel):
    items: List[FeedItemIn]
    associate_tag: Optional[str] = None

# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("category")
    await db.clicks.create_index("product_id")
    await db.clicks.create_index("timestamp")
    await db.subscribers.create_index("email", unique=True)

    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )

    # Seed default settings
    if not await db.settings.find_one({"key": "daily_goal"}):
        await db.settings.insert_one({"key": "daily_goal", "daily_sales_goal": 10, "growth_mode": "balanced"})

    # Seed categories
    cats = [
        {"slug": "technology", "name": "Technology", "icon": "cpu"},
        {"slug": "gaming", "name": "Gaming", "icon": "gamepad-2"},
        {"slug": "audio", "name": "Audio", "icon": "headphones"},
        {"slug": "home", "name": "Home", "icon": "home"},
        {"slug": "pets", "name": "Pets", "icon": "paw-print"},
        {"slug": "fitness", "name": "Fitness", "icon": "dumbbell"},
        {"slug": "smartphones", "name": "Smartphones", "icon": "smartphone"},
    ]
    for c in cats:
        await db.categories.update_one({"slug": c["slug"]}, {"$setOnInsert": c}, upsert=True)

    # Seed demo products
    if await db.products.count_documents({}) == 0:
        await seed_demo_products()

    # Seed default network
    if await db.networks.count_documents({}) == 0:
        for n in [
            {"name": "Amazon Associates", "country": "US", "currency": "USD"},
            {"name": "AliExpress Affiliate", "country": "US", "currency": "USD"},
            {"name": "eBay Partner Network", "country": "US", "currency": "USD"},
        ]:
            net = Network(**n).model_dump()
            await db.networks.insert_one(net)

async def seed_demo_products():
    img_gaming = "https://images.unsplash.com/photo-1673669231301-09baa4d7761b?w=800&q=80"
    img_audio = "https://images.unsplash.com/photo-1591105866700-cb5d708ccd93?w=800&q=80"
    img_fitness = "https://images.unsplash.com/photo-1650822942135-1ef6f1820214?w=800&q=80"
    img_laptop = "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80"
    img_phone = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"
    img_home = "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80"
    img_pet = "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80"
    img_watch = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"

    demo = [
        ("HyperX Cloud II Gaming Headset", "gaming", img_gaming, 79.99, 99.99, "Amazon", ["Virtual 7.1 surround","Memory foam ear cups","Detachable mic"]),
        ("Logitech G502 HERO Gaming Mouse", "gaming", img_gaming, 39.99, 79.99, "Amazon", ["25K DPI sensor","11 programmable buttons","LIGHTSYNC RGB"]),
        ("Razer BlackWidow V3 Mechanical Keyboard", "gaming", img_gaming, 109.99, 139.99, "Amazon", ["Green mechanical switches","Chroma RGB","Doubleshot ABS keycaps"]),
        ("Sony WH-1000XM5 Wireless Headphones", "audio", img_audio, 328.00, 399.99, "Amazon", ["Industry-leading noise cancellation","30h battery","Multipoint connection"]),
        ("Bose QuietComfort Earbuds II", "audio", img_audio, 199.00, 299.00, "Amazon", ["CustomTune tech","6h battery","IPX4 sweat resistant"]),
        ("JBL Flip 6 Bluetooth Speaker", "audio", img_audio, 89.95, 129.95, "Amazon", ["IP67 waterproof","12h playtime","PartyBoost"]),
        ("ASUS ROG Strix G16 Gaming Laptop", "technology", img_laptop, 1299.00, 1599.00, "Amazon", ["Intel Core i7-13650HX","RTX 4060","16GB DDR5"]),
        ("Dell XPS 13 Laptop", "technology", img_laptop, 899.00, 1199.00, "Amazon", ["Intel Core i5-1340P","13.4 inch FHD+","16GB LPDDR5"]),
        ("Samsung 27\" 4K Monitor", "technology", img_laptop, 279.99, 399.99, "Amazon", ["3840x2160 UHD","HDR10","Eye Saver Mode"]),
        ("Apple iPhone 15 128GB", "smartphones", img_phone, 699.00, 799.00, "Amazon", ["A16 Bionic","Dynamic Island","48MP camera"]),
        ("Google Pixel 8 Pro 256GB", "smartphones", img_phone, 799.00, 999.00, "Amazon", ["Tensor G3","Super Actua display","AI photo editing"]),
        ("Samsung Galaxy S24 Ultra", "smartphones", img_phone, 1099.99, 1299.99, "Amazon", ["Snapdragon 8 Gen 3","S Pen included","200MP camera"]),
        ("Instant Pot Duo 7-in-1 Pressure Cooker", "home", img_home, 79.00, 119.00, "Amazon", ["6 quart capacity","Slow cook & saute","14 smart programs"]),
        ("iRobot Roomba j7+ Robot Vacuum", "home", img_home, 449.00, 799.00, "Amazon", ["Auto-empty base","Obstacle avoidance","Smart mapping"]),
        ("Ninja Air Fryer XL 5.5-Quart", "home", img_home, 119.99, 169.99, "Amazon", ["Air fry & dehydrate","5.5 qt basket","Ceramic-coated"]),
        ("PetSafe Automatic Dog Feeder", "pets", img_pet, 89.95, 129.95, "Amazon", ["12 programmable meals","Slow feed mode","Battery backup"]),
        ("Furbo 360 Dog Camera", "pets", img_pet, 159.00, 249.00, "Amazon", ["360-degree view","Treat tossing","2-way audio"]),
        ("Fitbit Charge 6 Fitness Tracker", "fitness", img_watch, 129.95, 159.95, "Amazon", ["Built-in GPS","40+ exercise modes","7-day battery"]),
        ("Apple Watch Series 9 GPS 45mm", "fitness", img_watch, 379.00, 429.00, "Amazon", ["Double Tap gesture","S9 chip","Always-On Retina"]),
        ("Bowflex SelectTech 552 Dumbbells", "fitness", img_fitness, 349.00, 549.00, "Amazon", ["5-52.5 lbs range","15 weight settings","Space saving"]),
    ]

    for i, (name, cat, img, price, old, store, feats) in enumerate(demo):
        slug = slugify(name)
        p = Product(
            name=name, description=f"{name} — a top pick in {cat}. Great value for its price with strong specs and user ratings.",
            category=cat, image=img, price=price, old_price=old, store=store,
            network="Amazon Associates",
            affiliate_url=f"https://www.amazon.com/dp/B0DEMO{i:04d}?tag=dealhunterai-20",
            commission_pct=4.5, country="US", currency="USD",
            features=feats,
            pros=["Great price-to-value ratio", "Well-reviewed by verified buyers", "Reliable brand"],
            cons=["Popular — may sell out quickly"],
            tags=[cat, "demo"],
            featured=(i < 4),
            is_demo=True,
        )
        d = p.model_dump()
        d["slug"] = slug
        # simulate some usage stats for demo
        d["clicks"] = 40 + (i * 17) % 300
        d["sales"] = (i * 3) % 15
        d["revenue"] = d["sales"] * price
        d["commission_total"] = round(d["revenue"] * (p.commission_pct/100), 2)
        await db.products.insert_one(d)
    logger.info("Seeded 20 demo products")

# ---------------- Auth ----------------
@api.post("/auth/login")
async def login(inp: LoginIn):
    user = await db.users.find_one({"email": inp.email.lower()})
    if not user or not verify_password(inp.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@api.get("/auth/me")
async def me(admin=Depends(get_current_admin)):
    return admin

@api.post("/auth/change-password")
async def change_password(inp: ChangePasswordIn, admin=Depends(get_current_admin)):
    user = await db.users.find_one({"id": admin["id"]})
    if not user or not verify_password(inp.current_password, user["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    if len(inp.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    await db.users.update_one({"id": admin["id"]}, {"$set": {"password_hash": hash_password(inp.new_password)}})
    return {"ok": True, "message": "Password updated"}

@api.get("/admin/site-settings")
async def get_site_settings(admin=Depends(get_current_admin)):
    s = await db.settings.find_one({"key": "site"}, {"_id": 0}) or {}
    s.pop("key", None)
    defaults = SiteSettingsIn().model_dump()
    return {**defaults, **s}

@api.post("/admin/site-settings")
async def set_site_settings(inp: SiteSettingsIn, admin=Depends(get_current_admin)):
    await db.settings.update_one({"key": "site"}, {"$set": inp.model_dump()}, upsert=True)
    return {"ok": True, **inp.model_dump()}

# ---------------- Categories ----------------
@api.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats

# ---------------- Products (public) ----------------
def clean(doc):
    if doc: doc.pop("_id", None)
    return doc

@api.get("/products")
async def list_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None,
    sort: str = "newest",
    limit: int = 24,
    skip: int = 0,
):
    q: Dict[str, Any] = {"status": "active"}
    if category: q["category"] = category
    if max_price is not None: q["price"] = {"$lte": max_price}
    if featured is not None: q["featured"] = featured
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"name": rx}, {"description": rx}, {"tags": rx}, {"category": rx}]
    sort_map = {
        "newest": [("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "popular": [("clicks", -1)],
        "biggest_drop": [("old_price", -1)],
    }
    cursor = db.products.find(q, {"_id": 0}).sort(sort_map.get(sort, [("created_at", -1)])).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    total = await db.products.count_documents(q)
    return {"items": items, "total": total}

@api.get("/products/trending")
async def trending():
    items = await db.products.find({"status": "active"}, {"_id": 0}).sort([("clicks", -1)]).limit(8).to_list(8)
    return items

@api.get("/products/ai-picks")
async def ai_picks():
    items = await db.products.find({"status": "active"}, {"_id": 0}).sort([("sales", -1)]).limit(8).to_list(8)
    return items

@api.get("/products/price-drops")
async def price_drops():
    items = await db.products.find(
        {"status": "active", "old_price": {"$ne": None, "$gt": 0}},
        {"_id": 0}
    ).limit(20).to_list(20)
    items.sort(key=lambda p: ((p.get("old_price") or 0) - p["price"]) / max(p.get("old_price") or 1, 1), reverse=True)
    return items[:8]

@api.get("/products/best-value")
async def best_value():
    items = await db.products.find({"status": "active"}, {"_id": 0}).sort([("price", 1)]).limit(8).to_list(8)
    return items

@api.get("/products/new")
async def new_products():
    items = await db.products.find({"status": "active"}, {"_id": 0}).sort([("created_at", -1)]).limit(8).to_list(8)
    return items

@api.get("/products/slug/{slug}")
async def get_product_by_slug(slug: str):
    p = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    related = await db.products.find(
        {"category": p["category"], "slug": {"$ne": slug}, "status": "active"},
        {"_id": 0}
    ).limit(4).to_list(4)
    p["related"] = related
    return p

# ---------------- Products (admin) ----------------
@api.post("/admin/products")
async def create_product(inp: ProductIn, admin=Depends(get_current_admin)):
    p = Product(**inp.model_dump())
    d = p.model_dump()
    base_slug = slugify(p.name) or str(uuid.uuid4())[:8]
    slug = base_slug
    i = 1
    while await db.products.find_one({"slug": slug}):
        i += 1
        slug = f"{base_slug}-{i}"
    d["slug"] = slug
    await db.products.insert_one(d)
    d.pop("_id", None)
    return d

@api.put("/admin/products/{pid}")
async def update_product(pid: str, inp: ProductIn, admin=Depends(get_current_admin)):
    r = await db.products.update_one({"id": pid}, {"$set": inp.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    return p

@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, admin=Depends(get_current_admin)):
    r = await db.products.delete_one({"id": pid})
    return {"deleted": r.deleted_count}

# ---------------- Networks (admin) ----------------
@api.get("/admin/networks")
async def list_networks(admin=Depends(get_current_admin)):
    items = await db.networks.find({}, {"_id": 0}).to_list(100)
    return items

@api.post("/admin/networks")
async def create_network(inp: NetworkIn, admin=Depends(get_current_admin)):
    n = Network(**inp.model_dump()).model_dump()
    await db.networks.insert_one(n)
    n.pop("_id", None)
    return n

@api.put("/admin/networks/{nid}")
async def update_network(nid: str, inp: NetworkIn, admin=Depends(get_current_admin)):
    await db.networks.update_one({"id": nid}, {"$set": inp.model_dump()})
    return await db.networks.find_one({"id": nid}, {"_id": 0})

@api.delete("/admin/networks/{nid}")
async def delete_network(nid: str, admin=Depends(get_current_admin)):
    r = await db.networks.delete_one({"id": nid})
    return {"deleted": r.deleted_count}

# ---------------- Click Tracking ----------------
@api.get("/track/click/{pid}")
async def track_click(pid: str, request: Request,
                       utm_source: Optional[str] = None,
                       utm_medium: Optional[str] = None,
                       utm_campaign: Optional[str] = None):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Product not found")
    ua = request.headers.get("user-agent", "")[:200]
    device = "mobile" if any(x in ua.lower() for x in ["mobile","android","iphone"]) else "desktop"
    ref = request.headers.get("referer", "")[:200]
    await db.clicks.insert_one({
        "id": str(uuid.uuid4()),
        "product_id": pid,
        "timestamp": now_iso(),
        "device": device,
        "referer": ref,
        "utm_source": utm_source, "utm_medium": utm_medium, "utm_campaign": utm_campaign,
    })
    await db.products.update_one({"id": pid}, {"$inc": {"clicks": 1}})
    return RedirectResponse(url=p["affiliate_url"], status_code=302)

# ---------------- Conversions ----------------
@api.post("/track/conversion")
async def track_conversion(payload: dict):
    # Simple postback endpoint; in real world would validate secret & network signature
    pid = payload.get("product_id")
    amount = float(payload.get("amount", 0))
    commission = float(payload.get("commission", 0))
    status = payload.get("status", "pending")
    if not pid:
        raise HTTPException(400, "product_id required")
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Product not found")
    await db.conversions.insert_one({
        "id": str(uuid.uuid4()),
        "product_id": pid,
        "amount": amount,
        "commission": commission,
        "status": status,  # pending | confirmed | cancelled
        "order_ref": payload.get("order_ref", ""),
        "network": p.get("network", ""),
        "timestamp": now_iso(),
    })
    if status == "confirmed":
        await db.products.update_one({"id": pid}, {
            "$inc": {"sales": 1, "revenue": amount, "commission_total": commission}
        })
    return {"ok": True}

# ---------------- Dashboard ----------------
async def _range(days: int):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    return since

@api.get("/admin/dashboard/stats")
async def dashboard_stats(admin=Depends(get_current_admin)):
    today = (datetime.now(timezone.utc)).date().isoformat()
    since_today = today + "T00:00:00+00:00"
    since_30 = await _range(30)
    since_month = (datetime.now(timezone.utc).replace(day=1)).isoformat()

    today_clicks = await db.clicks.count_documents({"timestamp": {"$gte": since_today}})
    today_conv = await db.conversions.find({"timestamp": {"$gte": since_today}}, {"_id": 0}).to_list(1000)
    today_sales = len([c for c in today_conv if c["status"] == "confirmed"])
    today_revenue = sum(c["amount"] for c in today_conv if c["status"] == "confirmed")
    today_commission = sum(c["commission"] for c in today_conv if c["status"] == "confirmed")

    month_conv = await db.conversions.find({"timestamp": {"$gte": since_month}, "status": "confirmed"}, {"_id": 0}).to_list(10000)
    month_sales = len(month_conv)
    month_commission = sum(c["commission"] for c in month_conv)

    settings = await db.settings.find_one({"key": "daily_goal"}, {"_id": 0}) or {"daily_sales_goal": 10, "growth_mode": "balanced"}

    cr = round((today_sales / today_clicks * 100), 2) if today_clicks else 0.0

    # Chart: last 14 days clicks + sales
    trend = []
    for i in range(13, -1, -1):
        d0 = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        d1 = d0 + timedelta(days=1)
        s0 = d0.isoformat() + "T00:00:00+00:00"
        s1 = d1.isoformat() + "T00:00:00+00:00"
        cl = await db.clicks.count_documents({"timestamp": {"$gte": s0, "$lt": s1}})
        sl = await db.conversions.count_documents({"timestamp": {"$gte": s0, "$lt": s1}, "status": "confirmed"})
        trend.append({"date": d0.isoformat(), "clicks": cl, "sales": sl})

    top_products = await db.products.find({"status": "active"}, {"_id": 0}).sort([("clicks", -1)]).limit(5).to_list(5)

    return {
        "today_clicks": today_clicks,
        "today_sales": today_sales,
        "today_revenue": round(today_revenue, 2),
        "today_commission": round(today_commission, 2),
        "conversion_rate": cr,
        "daily_goal": settings.get("daily_sales_goal", 10),
        "growth_mode": settings.get("growth_mode", "balanced"),
        "remaining_goal": max(settings.get("daily_sales_goal", 10) - today_sales, 0),
        "month_sales": month_sales,
        "month_commission": round(month_commission, 2),
        "trend": trend,
        "top_products": top_products,
    }

@api.get("/admin/dashboard/settings")
async def get_settings(admin=Depends(get_current_admin)):
    s = await db.settings.find_one({"key": "daily_goal"}, {"_id": 0}) or {}
    s.pop("key", None)
    return s

@api.post("/admin/dashboard/settings")
async def set_settings(inp: DailyGoalIn, admin=Depends(get_current_admin)):
    await db.settings.update_one(
        {"key": "daily_goal"},
        {"$set": {"daily_sales_goal": inp.daily_sales_goal, "growth_mode": inp.growth_mode}},
        upsert=True
    )
    return {"ok": True, **inp.model_dump()}

@api.post("/admin/dashboard/simulator")
async def simulator(inp: SimulatorIn, admin=Depends(get_current_admin)):
    cr = max(inp.conversion_rate, 0.01) / 100
    required_visitors = int(inp.desired_sales / cr)
    expected_sales = inp.desired_sales
    expected_commission = round(inp.desired_sales * inp.avg_commission, 2)
    expected_revenue = round(expected_commission * 20, 2)  # rough estimate for illustration
    monthly = {
        "sales": expected_sales * 30,
        "commission": round(expected_commission * 30, 2),
        "visitors": required_visitors * 30,
    }
    return {
        "required_visitors": required_visitors,
        "expected_sales": expected_sales,
        "expected_commission": expected_commission,
        "expected_revenue": expected_revenue,
        "monthly": monthly,
        "note": "Estimate only. Actual results may vary."
    }

# ---------------- Reports ----------------
@api.get("/admin/reports/{period}")
async def reports(period: str, admin=Depends(get_current_admin)):
    days_map = {"daily": 1, "weekly": 7, "monthly": 30}
    days = days_map.get(period, 7)
    since = await _range(days)
    clicks = await db.clicks.count_documents({"timestamp": {"$gte": since}})
    conv = await db.conversions.find({"timestamp": {"$gte": since}}, {"_id": 0}).to_list(10000)
    sales = [c for c in conv if c["status"] == "confirmed"]
    pending = [c for c in conv if c["status"] == "pending"]
    revenue = sum(c["amount"] for c in sales)
    commission = sum(c["commission"] for c in sales)
    ctr = 0.0  # need visitors data
    cr = round(len(sales) / clicks * 100, 2) if clicks else 0.0

    top = await db.products.find({"status": "active"}, {"_id": 0}).sort([("sales", -1), ("clicks", -1)]).limit(10).to_list(10)
    return {
        "period": period,
        "clicks": clicks,
        "sales": len(sales),
        "pending": len(pending),
        "revenue": round(revenue, 2),
        "commission": round(commission, 2),
        "conversion_rate": cr,
        "top_products": top,
        "generated_at": now_iso(),
    }

# ---------------- AI Search & Content & Strategist ----------------
async def _llm_generate(system: str, prompt: str) -> str:
    """Wrapper to call Emergent LLM. Returns text or a fallback string."""
    if not EMERGENT_LLM_KEY:
        return ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"session-{uuid.uuid4()}",
            system_message=system,
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        return resp if isinstance(resp, str) else str(resp)
    except Exception as e:
        logger.warning(f"LLM error: {e}")
        return ""

@api.post("/ai/search")
async def ai_search(inp: AiSearchIn):
    """Interpret user query and return matching products. LLM extracts filters, DB does the search."""
    system = ("You are a shopping query interpreter. Return STRICT JSON only, no markdown. "
              "Extract: category (one of: technology, gaming, audio, home, pets, fitness, smartphones, or empty), "
              "keywords (array of short strings), max_price (number or null).")
    prompt = f'User query: "{inp.query}". Return JSON: {{"category":"","keywords":[],"max_price":null}}'
    txt = await _llm_generate(system, prompt)
    import json as _json
    filters = {"category": "", "keywords": [], "max_price": None}
    if txt:
        try:
            m = re.search(r'\{.*\}', txt, re.S)
            if m:
                filters = {**filters, **_json.loads(m.group(0))}
        except Exception:
            pass
    # Fallback keyword extraction
    q: Dict[str, Any] = {"status": "active"}
    if filters.get("category"): q["category"] = filters["category"]
    if filters.get("max_price"): q["price"] = {"$lte": float(filters["max_price"])}
    kws = filters.get("keywords") or []
    text_q = " ".join(kws) or inp.query
    if text_q:
        rx = {"$regex": re.escape(text_q.split()[0]) if text_q.split() else "", "$options": "i"}
        q["$or"] = [{"name": rx}, {"description": rx}, {"tags": rx}, {"category": rx}]
    items = await db.products.find(q, {"_id": 0}).limit(24).to_list(24)
    if not items:
        # broaden — drop $or
        q.pop("$or", None)
        items = await db.products.find(q, {"_id": 0}).limit(24).to_list(24)
    return {"filters": filters, "results": items, "query": inp.query}

@api.post("/admin/ai/content")
async def ai_content(inp: ContentGenIn, admin=Depends(get_current_admin)):
    p = await db.products.find_one({"id": inp.product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    prompts = {
        "description": "Write a compelling 120-word product description for e-commerce shoppers. Highlight the top 3 benefits. Do NOT invent specs. Do NOT make guaranteed claims.",
        "seo_article": "Write a 350-word SEO article introducing this product. Include an H1, 2 H2 subheadings, and a friendly CTA to check the latest price. Avoid guarantees.",
        "social_tiktok": "Write a punchy TikTok script (30s max) with a hook, 3 quick benefits, and a CTA. Include 5 hashtags at the end.",
        "social_instagram": "Write an Instagram caption (max 90 words) with 3 emoji-free bullet benefits and 6 hashtags.",
        "social_facebook": "Write a Facebook post (80 words) with a clear headline, 3 benefits, and a soft CTA.",
        "social_pinterest": "Write a Pinterest pin title (max 100 chars) and a 200-char description with 3 keywords.",
        "social_x": "Write 3 X (Twitter) posts under 220 chars each highlighting a different angle. No hashtags in the first, 2 hashtags in the second and third.",
        "social_youtube_shorts": "Write a 45-second YouTube Shorts script with hook, 3 benefits, and CTA. Include a suggested title under 60 chars.",
        "ad_ideas": "Suggest 5 concise ad angles (headline + 1-line description each) targeting different buyer personas.",
        "headlines": "Generate 8 short, click-worthy headlines under 60 chars each. No hype words like 'guaranteed'.",
        "cta": "Generate 6 short CTA buttons (2-4 words each) suited for a product page.",
    }
    system = "You are a marketing copywriter for an affiliate deal platform. Never invent specs. Never use 'guaranteed', 'guaranteed income', or misleading claims. Output plain text only unless asked for JSON."
    prompt = f"Product: {p['name']}\nCategory: {p['category']}\nPrice: {p['currency']} {p['price']}\nFeatures: {', '.join(p.get('features') or [])}\n\nTask: {prompts.get(inp.content_type, 'Write a marketing draft.')}"
    txt = await _llm_generate(system, prompt) or "AI unavailable. Please try again."

    # Save as draft
    draft = {
        "id": str(uuid.uuid4()),
        "product_id": inp.product_id,
        "content_type": inp.content_type,
        "content": txt,
        "status": "draft",
        "created_at": now_iso(),
    }
    await db.content_drafts.insert_one(draft)
    draft.pop("_id", None)
    return draft

@api.get("/admin/ai/drafts")
async def list_drafts(admin=Depends(get_current_admin)):
    items = await db.content_drafts.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(50).to_list(50)
    return items

@api.get("/admin/ai/strategist")
async def strategist(admin=Depends(get_current_admin)):
    """Analyze products & generate recommendations."""
    products = await db.products.find({"status": "active"}, {"_id": 0}).to_list(200)
    settings = await db.settings.find_one({"key": "daily_goal"}, {"_id": 0}) or {"daily_sales_goal": 10, "growth_mode": "balanced"}
    goal = settings.get("daily_sales_goal", 10)
    mode = settings.get("growth_mode", "balanced")

    # Compute simple heuristic recommendations
    recs = []
    if not products:
        recs.append({"title": "Add your first product", "detail": "You have no active products yet. Add a product to start tracking clicks and conversions.", "priority": "high"})
    else:
        # High traffic low conversion
        for p in products:
            if p["clicks"] >= 80 and p["sales"] == 0:
                recs.append({
                    "title": f"Test a new headline for {p['name']}",
                    "detail": f"{p['name']} has {p['clicks']} clicks but 0 confirmed sales. Consider testing another headline or CTA.",
                    "priority": "high",
                    "product_id": p["id"],
                })
        # Best CTR by category
        by_cat = {}
        for p in products:
            by_cat.setdefault(p["category"], []).append(p)
        best_cat = None; best_score = -1
        for c, arr in by_cat.items():
            score = sum(x["clicks"] for x in arr)
            if score > best_score:
                best_score = score; best_cat = c
        if best_cat:
            recs.append({"title": f"{best_cat.title()} is your top-performing category", "detail": f"{best_cat.title()} generated the most clicks. Consider featuring more products from this category.", "priority": "medium"})
        # Best conversion product
        top_conv = sorted(products, key=lambda p: p["sales"], reverse=True)[:1]
        if top_conv and top_conv[0]["sales"] > 0:
            tp = top_conv[0]
            recs.append({"title": f"Feature {tp['name']} on the homepage", "detail": f"{tp['name']} has the highest confirmed sales in your catalog.", "priority": "medium", "product_id": tp["id"]})
        # Goal analysis
        today = datetime.now(timezone.utc).date().isoformat()
        since_today = today + "T00:00:00+00:00"
        today_sales = await db.conversions.count_documents({"timestamp": {"$gte": since_today}, "status": "confirmed"})
        remaining = max(goal - today_sales, 0)
        if remaining > 0:
            recs.append({"title": f"Goal remaining: {remaining} sales today", "detail": f"You are {remaining} sale(s) away from today's goal of {goal}. Based on current conversion rate, additional qualified traffic may be necessary.", "priority": "high"})

    # Growth mode multiplier
    mode_note = {
        "conservative": "Conservative mode: focus on proven products, limited experiments.",
        "balanced": "Balanced mode: mix of proven bets and controlled new experiments.",
        "aggressive": "Aggressive mode: run more content/SEO experiments to gather more data.",
    }
    return {
        "recommendations": recs[:8],
        "mode": mode,
        "mode_note": mode_note.get(mode, ""),
        "generated_at": now_iso(),
    }

@api.get("/admin/ai/opportunity-score/{pid}")
async def opportunity_score(pid: str, admin=Depends(get_current_admin)):
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    if p["clicks"] < 10:
        return {"score": None, "label": "Not enough data", "color": "gray"}
    cr = (p["sales"] / max(p["clicks"], 1)) * 100
    discount = 0
    if p.get("old_price"):
        discount = (p["old_price"] - p["price"]) / p["old_price"] * 100
    score = min(int(cr * 15 + discount * 0.8 + min(p["clicks"] / 5, 40)), 100)
    if score >= 80:
        label, color = "Hot", "red"
    elif score >= 60:
        label, color = "Strong", "green"
    elif score >= 40:
        label, color = "Testing", "yellow"
    else:
        label, color = "Weak", "gray"
    return {"score": score, "label": label, "color": color, "ctr": round(cr, 2), "discount_pct": round(discount, 2)}

@api.post("/admin/ai/daily-plan")
async def daily_plan(admin=Depends(get_current_admin)):
    settings = await db.settings.find_one({"key": "daily_goal"}, {"_id": 0}) or {"daily_sales_goal": 10, "growth_mode": "balanced"}
    goal = settings.get("daily_sales_goal", 10)
    mode = settings.get("growth_mode", "balanced")
    counts = {"conservative": (1, 1, 1), "balanced": (3, 2, 1), "aggressive": (5, 3, 2)}
    posts, headlines, articles = counts.get(mode, (3, 2, 1))
    top = await db.products.find({"status": "active"}, {"_id": 0}).sort([("clicks", -1)]).limit(3).to_list(3)
    tasks = [
        {"title": f"Create {posts} social posts", "priority": "high", "reason": f"{mode.title()} mode allocation", "expected": "More content surface for potential buyers"},
        {"title": f"Test {headlines} product headlines", "priority": "medium", "reason": "A/B test improves CTR", "expected": "Better CTR on affected products"},
        {"title": f"Publish {articles} SEO article(s)", "priority": "medium", "reason": "Long-term traffic", "expected": "Organic visitor growth"},
    ]
    for p in top[:2]:
        tasks.append({"title": f"Feature: {p['name']}", "priority": "medium", "reason": "Currently one of your top-performing products", "expected": "Sustain click momentum", "product_id": p["id"]})
    return {"target": goal, "mode": mode, "tasks": tasks, "generated_at": now_iso(),
            "note": "Goal-based plan. Execute manually; nothing is auto-published."}

# ---------------- Subscribers ----------------
@api.post("/subscribers")
async def subscribe(inp: SubscribeIn):
    try:
        await db.subscribers.insert_one({
            "id": str(uuid.uuid4()),
            "email": inp.email.lower(),
            "consent": True,
            "created_at": now_iso(),
        })
    except Exception:
        pass  # duplicate
    return {"ok": True}

# ---------------- Quick Start ----------------
@api.get("/admin/quick-start")
async def quick_start(admin=Depends(get_current_admin)):
    has_network = (await db.networks.count_documents({"active": True})) > 0
    real_products = await db.products.count_documents({"is_demo": False, "status": "active"})
    goal_set = await db.settings.find_one({"key": "daily_goal"})
    drafts = await db.content_drafts.count_documents({})
    clicks = await db.clicks.count_documents({})
    conf_sales = await db.conversions.count_documents({"status": "confirmed"})
    steps = [
        {"key": "network", "label": "Connect Affiliate Network", "done": has_network},
        {"key": "product", "label": "Add First Product", "done": real_products > 0},
        {"key": "goal", "label": "Set Daily Sales Goal", "done": bool(goal_set)},
        {"key": "content", "label": "Generate AI Content", "done": drafts > 0},
        {"key": "publish", "label": "Publish Product", "done": real_products > 0},
        {"key": "click", "label": "Get First Click", "done": clicks > 0},
        {"key": "sale", "label": "Get First Confirmed Sale", "done": conf_sales > 0},
    ]
    done_count = sum(1 for s in steps if s["done"])
    progress = int(done_count / len(steps) * 100)
    return {"steps": steps, "progress": progress}

# ---------------- Price Alerts ----------------
@api.post("/alerts")
async def create_alert(inp: PriceAlertIn):
    p = await db.products.find_one({"id": inp.product_id})
    if not p:
        raise HTTPException(404, "Product not found")
    await db.price_alerts.insert_one({
        "id": str(uuid.uuid4()),
        "email": inp.email.lower(),
        "product_id": inp.product_id,
        "product_name": p["name"],
        "target_price": inp.target_price,
        "status": "active",
        "notified_at": None,
        "created_at": now_iso(),
    })
    return {"ok": True, "message": "We'll notify you when the price drops."}

@api.get("/admin/alerts")
async def list_alerts(admin=Depends(get_current_admin)):
    items = await db.price_alerts.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(500)
    return items

@api.post("/admin/alerts/check")
async def check_alerts(admin=Depends(get_current_admin)):
    """Evaluate active alerts: mark 'triggered' when current price <= target."""
    active = await db.price_alerts.find({"status": "active"}, {"_id": 0}).to_list(1000)
    triggered = []
    for a in active:
        p = await db.products.find_one({"id": a["product_id"]}, {"_id": 0})
        if p and p["price"] <= a["target_price"]:
            await db.price_alerts.update_one(
                {"id": a["id"]},
                {"$set": {"status": "triggered", "notified_at": now_iso(), "current_price": p["price"]}}
            )
            triggered.append({"email": a["email"], "product": p["name"], "target": a["target_price"], "current": p["price"]})
    return {"triggered_count": len(triggered), "triggered": triggered,
            "note": "Email delivery requires an email integration (Resend/SendGrid). Alerts are marked triggered on the server."}

# ---------------- Blog / SEO Publisher ----------------
@api.post("/admin/blog/publish")
async def blog_publish(inp: BlogPublishIn, admin=Depends(get_current_admin)):
    draft = await db.content_drafts.find_one({"id": inp.draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(404, "Draft not found")
    product = await db.products.find_one({"id": draft["product_id"]}, {"_id": 0})
    base_slug = slugify(inp.title) or f"post-{str(uuid.uuid4())[:8]}"
    slug = base_slug
    i = 1
    while await db.blog_posts.find_one({"slug": slug}):
        i += 1
        slug = f"{base_slug}-{i}"
    post = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "title": inp.title,
        "meta_description": inp.meta_description or (draft["content"][:155] + "…"),
        "cover_image": inp.cover_image or (product["image"] if product else ""),
        "content": draft["content"],
        "product_id": draft["product_id"],
        "product_name": product["name"] if product else "",
        "product_slug": product.get("slug") if product else "",
        "published_at": now_iso(),
    }
    await db.blog_posts.insert_one(post)
    await db.content_drafts.update_one({"id": inp.draft_id}, {"$set": {"status": "published", "blog_slug": slug}})
    post.pop("_id", None)
    return post

@api.get("/blog")
async def list_blog():
    items = await db.blog_posts.find({}, {"_id": 0, "content": 0}).sort([("published_at", -1)]).limit(50).to_list(50)
    return items

@api.get("/blog/{slug}")
async def get_blog(slug: str):
    p = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return p

@api.delete("/admin/blog/{pid}")
async def delete_blog(pid: str, admin=Depends(get_current_admin)):
    r = await db.blog_posts.delete_one({"id": pid})
    return {"deleted": r.deleted_count}

# ---------------- Sitemap ----------------
@api.get("/sitemap.xml")
async def sitemap():
    from fastapi.responses import Response
    base = os.environ.get("SITE_URL", "https://smart-deal-hub-1.preview.emergentagent.com")
    urls = [f"{base}/", f"{base}/deals", f"{base}/blog"]
    async for p in db.products.find({"status": "active"}, {"slug": 1, "_id": 0}):
        urls.append(f"{base}/product/{p['slug']}")
    async for c in db.categories.find({}, {"slug": 1, "_id": 0}):
        urls.append(f"{base}/category/{c['slug']}")
    async for b in db.blog_posts.find({}, {"slug": 1, "_id": 0}):
        urls.append(f"{base}/blog/{b['slug']}")
    body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        body += f"  <url><loc>{u}</loc></url>\n"
    body += "</urlset>\n"
    return Response(content=body, media_type="application/xml")

@api.get("/robots.txt")
async def robots():
    from fastapi.responses import Response
    base = os.environ.get("SITE_URL", "https://smart-deal-hub-1.preview.emergentagent.com")
    body = f"User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: {base}/api/sitemap.xml\n"
    return Response(content=body, media_type="text/plain")

# ---------------- Feed Import (Amazon & compatible) ----------------
@api.post("/admin/import/feed")
async def import_feed(inp: FeedImportIn, admin=Depends(get_current_admin)):
    """Bulk import products from a JSON feed. Compatible with Amazon Associates output,
    or any generic e-commerce feed with the fields defined in FeedItemIn."""
    created, updated, errors = 0, 0, []
    for item in inp.items:
        try:
            d = item.model_dump()
            # If an associate_tag is provided and affiliate_url doesn't already carry one, append it.
            if inp.associate_tag and "tag=" not in d["affiliate_url"]:
                sep = "&" if "?" in d["affiliate_url"] else "?"
                d["affiliate_url"] = f"{d['affiliate_url']}{sep}tag={inp.associate_tag}"
            existing = await db.products.find_one({"affiliate_url": d["affiliate_url"]})
            if existing:
                await db.products.update_one({"id": existing["id"]}, {"$set": {
                    "price": d["price"], "old_price": d.get("old_price"),
                    "name": d["name"], "image": d["image"] or existing.get("image", ""),
                }})
                updated += 1
                continue
            base_slug = slugify(d["name"]) or str(uuid.uuid4())[:8]
            slug = base_slug
            i = 1
            while await db.products.find_one({"slug": slug}):
                i += 1
                slug = f"{base_slug}-{i}"
            p = Product(**d).model_dump()
            p["slug"] = slug
            p["is_demo"] = False
            await db.products.insert_one(p)
            created += 1
        except Exception as e:
            errors.append({"name": item.name if hasattr(item, 'name') else "?", "error": str(e)})
    return {"created": created, "updated": updated, "errors": errors, "total": len(inp.items)}

# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@api.get("/")
async def root():
    return {"ok": True, "service": "Deal Hunter AI"}

@app.on_event("shutdown")
async def shutdown():
    client.close()
