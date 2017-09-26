export function capitalizeFirstLetter(string) {
  if (string && string.length > 0) {
    return string.charAt(0).toUpperCase() + string.slice(1);  
  } else {
    return string;
  }  
}

export function onlyCapitalFirstLetter(string) {
  if (string && string.length > 0) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();  
  } else {
    return string;
  }  
}