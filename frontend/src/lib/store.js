const FAV_KEY = "dhai_favs";
const CMP_KEY = "dhai_compare";

export const getFavs = () => JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
export const isFav = (id) => getFavs().includes(id);
export const toggleFav = (id) => {
  const list = getFavs();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
  return list;
};

export const getCompare = () => JSON.parse(localStorage.getItem(CMP_KEY) || "[]");
export const isCompared = (id) => getCompare().includes(id);
export const toggleCompare = (id) => {
  const list = getCompare();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else {
    if (list.length >= 4) return { list, error: "You can compare up to 4 products." };
    list.push(id);
  }
  localStorage.setItem(CMP_KEY, JSON.stringify(list));
  return { list, error: null };
};
