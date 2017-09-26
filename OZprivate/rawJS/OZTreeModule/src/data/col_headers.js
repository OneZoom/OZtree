/* This is a hack. We should be getting this infor from a null call to the node_details API */

let col_headers = JSON.parse('{"colnames_leaves":{"name":3,"price":5,"popularity":2,"extinction_date":4,"ott":1,"id":0},"colnames_images":{"rating":3,"src_id":1,"ott":0,"src":2},"colnames_nodes":{"{pic}8":21,"iucnDD":6,"id":0,"iucnCR":11,"iucnEN":10,"iucnVU":9,"{pic}1":14,"{pic}2":15,"{pic}3":16,"{pic}4":17,"{pic}5":18,"{pic}6":19,"{pic}7":20,"iucnEX":13,"ott":1,"iucnEW":12,"iucnNT":8,"name":4,"age":3,"popularity":2,"iucnNE":5,"iucnLC":7},"colnames_reservations":{"verified_kind":1,"verified_more_info":3,"verified_url":4,"verified_name":2,"OTT_ID":0}}');

export {col_headers};