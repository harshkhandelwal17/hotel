const debounce = (func, wait) => {
  let timeout;
  return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
};

let callCount = 0;
const func = () => console.log("Called", ++callCount);
const debounced = debounce(func, 100);

debounced();
debounced();
setTimeout(debounced, 150);
