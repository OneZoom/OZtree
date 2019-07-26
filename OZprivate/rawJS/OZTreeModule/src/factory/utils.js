import tree_state from '../tree_state';

export function spec_num_full(node) {
    let speciestext1 = node.richness_val.toString();
    if (node.richness_val >= 1000) {
        speciestext1 = speciestext1.substring(0, speciestext1.length-3) + "," + speciestext1.substring(speciestext1.length-3, speciestext1.length);
    }
    if (node.richness_val >= 1000000) {
        speciestext1 = speciestext1.substring(0, speciestext1.length-7) + "," + speciestext1.substring(speciestext1.length-7, speciestext1.length);
    }
    return speciestext1 + " " + ((node.richness_val > 1) ? OZstrings['spp'] : OZstrings['sp']);
}


export function number_convert(numIn) {
    let speciestext1 = (numIn).toString();
    if (numIn >= 1000)
    {
        speciestext1 = speciestext1.substring(0, speciestext1.length-3) + "," + speciestext1.substring(speciestext1.length-3, speciestext1.length);
    }
    if (numIn >= 1000000)
    {
        speciestext1 = speciestext1.substring(0, speciestext1.length-7) + "," + speciestext1.substring(speciestext1.length-7, speciestext1.length);
    }
    
    return speciestext1 + " " + ((numIn > 1)?OZstrings['spp'] : OZstrings['sp']);
}

export function view_richness(node) {
  //TODO: implement later
  return node.richness_val;
}

export function is_primary_or_secondary_name(node) {
  return iprimary_name(node) || isecondary_name(node);
}

export function gpmapper(datein, full) {
  for (let i=0; i<OZstrings["geological"]["periods"].length; i++) {
    if (datein < OZstrings["geological"]["periods"][i]['Ma']) {
      if (full) {
        return OZstrings["geological"]["periods"][i]["long"];
      } else {
        return OZstrings["geological"]["periods"][i]["name"];
      }
    }
  }
  for (let i=0; i<OZstrings["geological"]["eons"].length; i++) {
    if (datein < OZstrings["geological"]["eons"][i]['Ma']) {
      if (full) {
        return OZstrings["geological"]["eons"][i]["long"];
      } else {
        return OZstrings["geological"]["eons"][i]["name"];
      }
    }
  }
  return "";
}


export function ageAsText(Ma, leaf) {
  //return e.g. "100 thousand years ago", or a similar string
  let subs_strs = leaf?OZstrings['leaf_date']:OZstrings['node_date'];
  if (Ma >10) {
    return subs_strs['Mya'].replace(
        /\{(\w+)\}/g,
        function (m, c) {return({'mya':(Math.round(Ma*10)/10.0).toString()}[c])});
  } else {
    if (Ma > 1) {
      return subs_strs['Mya'].replace(
        /\{(\w+)\}/g,
        function (m, c) {return({'mya':(Math.round(Ma*100)/100.0).toString()}[c])});
    } else if (Ma > 0.001) {
      return subs_strs['tya'].replace(
        /\{(\w+)\}/g,
        function (m, c) {return({'tya':(Math.round(Ma*10000)/10.0).toString()}[c])});
    } else {
      return subs_strs['ya'].replace(
        /\{(\w+)\}/g,
        function (m, c) {return({'ya':(Math.round(Ma*1000000)).toString()}[c])});
    }
  }
}


function iprimary_name(node) {
  if (node.latin_name || node.cname) {
    return true;
  } else {
    return false;
  }
}

function isecondary_name(node) {
  if (node.latin_name || node.cname) {
    return true;
  } else {
    return false;
  }
}

export function extxt(node) {
  if (node.redlist) {
    return conconvert(node.redlist);
  } else {
    return OZstrings['IUCN'][''];
  }
}


function conconvert(casein)
{
    if (OZstrings['IUCN'].hasOwnProperty(casein)) {
        return(OZstrings['IUCN'][casein])
    } else {
        return(OZstrings['IUCN'][''])        
    }
}


