/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_factory_data_repo.js
  */
import data_repo from '../src/factory/data_repo.js';
import test from 'tape';


// From static/FinalOutputs/data/completetree_0.js
var rawdata = '((()))';
var metadata = {
"leaf_meta":{
"0":["OTTid","scientificName","common_en","popularity","picID","picID_credit","picID_rating","IUCN","price","sponsor_kind","sponsor_name","sponsor_extra","sponsor_url","n_spp"],
"temp":[null," "]},

"node_meta":{
"0":["OTTid","scientificName","common_en","popularity","picID","picID_credit","picID_rating","IUCN","price","sponsor_kind","sponsor_name","sponsor_extra","sponsor_url","lengthbr","sp1","sp2","sp3","sp4","sp5","sp6","sp7","sp8","iucnNE","iucnDD","iucnLC","iucnNT","iucnVU","iucnEN","iucnCR","iucnEW","iucnEX"],
"temp":[]}};

test('DataRepo:parse_pics', function (t) {
    function um (ottids, leafPic) {
        let leaves = {
            770315: [837461,770315,176839.3579154182,"Homo sapiens",null,null],
            158484: [837462,158484,182704.23513227384,"Pan paniscus",null,null],
            417950: [837463,417950,175868.4889146225,"Pan troglodytes",null,null],
        };
        let vernaculars = {
            770315: [770315,"Human"],
            158484: [158484,"Bonobo"],
            417950: [417950,"Chimpanzee"],
        }
        let leafIucn = {
            158484: [158484,"EN"],
            417950: [417950,"EN"],
        };

        data_repo.update_metadata({
            "leaves": ottids.map(ottid => leaves[ottid]).filter(x => !!x),
            "leafPic":leafPic,
            "reservations":[],
            "nodes":[],
            "lang":"en-GB,en;q=0.9",
            "vernacular_by_ott": ottids.map(ottid => vernaculars[ottid]).filter(x => !!x),
            "vernacular_by_name":[],
            "leafIucn": ottids.map(ottid => leafIucn[ottid]).filter(x => !!x),
        });
    }

    function pic_metadata() {
        return Object.keys(data_repo.metadata.leaf_meta).map(function (ozid) {
            let m = data_repo.metadata.leaf_meta[ozid];
            return {
                ozid: ozid,
                "OTTid": m[data_repo.mc_key_l["OTTid"]],
                "picID": m[data_repo.mc_key_l["picID"]],
                "picID_src": m[data_repo.mc_key_l["picID_src"]],
                "picID_rating": m[data_repo.mc_key_l["picID_rating"]],
                "picID_credit": m[data_repo.mc_key_l["picID_credit"]],
            };
        }).filter(function (x) { return x.ozid !== '0' && x.ozid !== 'temp' });
    }

    data_repo.setup({raw_data: rawdata, cut_map: {}, poly_cut_map: {}, metadata: metadata, cut_threshold: 10000, tree_date: "{}"});
    t.deepEqual(pic_metadata(), [], "No leaves at start");

    // Add some leaves without images
    um([770315, 158484, 417950], []);
    t.deepEqual(pic_metadata(), [
        { ozid: '837461', OTTid: 770315, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: '837462', OTTid: 158484, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: '837463', OTTid: 417950, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
    ], "Added leaves without any images");

    um([158484, 417950], [
        [158484,26863090,99,40000],
        [417950,27252520,99,50000],
    ]);
    t.deepEqual(pic_metadata(), [
        { ozid: '837461', OTTid: 770315, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: '837462', OTTid: 158484, picID: '26863090', picID_src: '99', picID_rating: 40000, picID_credit: null },
        { ozid: '837463', OTTid: 417950, picID: '27252520', picID_src: '99', picID_rating: 50000, picID_credit: null },
    ], "Added 2 leaves, only 2 with images");

    um([770315, 158484], [
        [158484,12345678,99,40000],
        [770315,26865347,99,35217],
    ]);
    t.deepEqual(pic_metadata(), [
        { ozid: '837461', OTTid: 770315, picID: '26865347', picID_src: '99', picID_rating: 35217, picID_credit: null },
        { ozid: '837462', OTTid: 158484, picID: '12345678', picID_src: '99', picID_rating: 40000, picID_credit: null },
        { ozid: '837463', OTTid: 417950, picID: '27252520', picID_src: '99', picID_rating: 50000, picID_credit: null },
    ], "Added 1 image, updated another, leave final alone");

    um([770315], [
    ]);
    t.deepEqual(pic_metadata(), [
        { ozid: '837461', OTTid: 770315, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: '837462', OTTid: 158484, picID: '12345678', picID_src: '99', picID_rating: 40000, picID_credit: null },
        { ozid: '837463', OTTid: 417950, picID: '27252520', picID_src: '99', picID_rating: 50000, picID_credit: null },
    ], "Removed 1 image");

    t.end();
});

test.onFinish(function() { 
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
