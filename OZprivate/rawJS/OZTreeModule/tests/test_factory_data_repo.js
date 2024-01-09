/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_factory_data_repo.js
  */
import data_repo from '../src/factory/data_repo.js';
import test from 'tape';


// From static/FinalOutputs/data/completetree_0.js
var rawdata = '((()))';

test('DataRepo:update_metadata', function (t) {
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
            417950: [417950,"LC"],
        };

        data_repo.update_metadata({
            "leaves": ottids.map(ottid => leaves[ottid]).filter(x => !!x),
            "leafPic":leafPic,
            "reservations":[
                // OTT_ID, verified_kind, verified_name, verified_more_info, verified_url
                [770315, "For", "Arthur Dent", "Don't panic", "https://example.com"],
            ],
            "nodes":[],
            "lang":"en-GB,en;q=0.9",
            "vernacular_by_ott": ottids.map(ottid => vernaculars[ottid]).filter(x => !!x),
            "vernacular_by_name":[],
            "leafIucn": ottids.map(ottid => leafIucn[ottid]).filter(x => !!x),
        });
    }

    function pic_metadata(fields) {
        return Object.keys(data_repo.metadata.leaf_meta).map(function (leaf_metacode) {
            let m = data_repo.get_meta_entry(-leaf_metacode);
            let out = { ozid: -leaf_metacode };
            fields.forEach((k) => out[k] = m.entry[m.idx[k]]);
            return out;
        }).filter(function (x) { return x.ozid !== '0' && x.ozid !== 'temp' });
    }

    data_repo.setup({raw_data: rawdata, cut_map: {}, poly_cut_map: {}, cut_threshold: 10000, tree_date: "{}"});
    t.deepEqual(pic_metadata(["OTTid", "picID", "picID_src", "picID_rating", "picID_credit"]), [], "No leaves at start");

    // Add some leaves without images
    um([770315, 158484, 417950], []);
    t.deepEqual(pic_metadata(["OTTid", "picID", "picID_src", "picID_rating", "picID_credit"]), [
        { ozid: -837461, OTTid: 770315, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: -837462, OTTid: 158484, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: -837463, OTTid: 417950, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
    ], "Added leaves without any images");

    // Test parse_ordered_leaves, parse_iucn
    t.deepEqual(pic_metadata(["OTTid", "scientificName", "common_en", "popularity", "IUCN"]), [
        { ozid: -837461, OTTid: 770315, scientificName: 'Homo sapiens', common_en: 'Human', popularity: 176839.3579154182, IUCN: undefined },
        { ozid: -837462, OTTid: 158484, scientificName: 'Pan paniscus', common_en: 'Bonobo', popularity: 182704.23513227384, IUCN: 'EN' },
        { ozid: -837463, OTTid: 417950, scientificName: 'Pan troglodytes', common_en: 'Chimpanzee', popularity: 175868.4889146225, IUCN: 'LC' },
    ], "Names, popularity, IUCN set");

    // Test parse_sponsorship
    t.deepEqual(pic_metadata(["OTTid", "sponsor_name", "sponsor_kind", "sponsor_extra", "sponsor_url"]), [
        { ozid: -837461, OTTid: 770315, sponsor_name: 'Arthur Dent', sponsor_kind: 'For', sponsor_extra: 'Don\'t panic', sponsor_url: 'https://example.com' },
        { ozid: -837462, OTTid: 158484, sponsor_name: undefined, sponsor_kind: undefined, sponsor_extra: undefined, sponsor_url: undefined },
        { ozid: -837463, OTTid: 417950, sponsor_name: undefined, sponsor_kind: undefined, sponsor_extra: undefined, sponsor_url: undefined },
    ], "Sponsorship details set");

    um([158484, 417950], [
        [158484,26863090,99,40000],
        [417950,27252520,99,50000],
    ]);
    t.deepEqual(pic_metadata(["OTTid", "picID", "picID_src", "picID_rating", "picID_credit"]), [
        { ozid: -837461, OTTid: 770315, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: -837462, OTTid: 158484, picID: '26863090', picID_src: '99', picID_rating: 40000, picID_credit: null },
        { ozid: -837463, OTTid: 417950, picID: '27252520', picID_src: '99', picID_rating: 50000, picID_credit: null },
    ], "Added 2 leaves, only 2 with images");

    um([770315, 158484], [
        [158484,12345678,99,40000],
        [770315,26865347,99,35217],
    ]);
    t.deepEqual(pic_metadata(["OTTid", "picID", "picID_src", "picID_rating", "picID_credit"]), [
        { ozid: -837461, OTTid: 770315, picID: '26865347', picID_src: '99', picID_rating: 35217, picID_credit: null },
        { ozid: -837462, OTTid: 158484, picID: '12345678', picID_src: '99', picID_rating: 40000, picID_credit: null },
        { ozid: -837463, OTTid: 417950, picID: '27252520', picID_src: '99', picID_rating: 50000, picID_credit: null },
    ], "Added 1 image, updated another, leave final alone");

    um([770315], [
    ]);
    t.deepEqual(pic_metadata(["OTTid", "picID", "picID_src", "picID_rating", "picID_credit"]), [
        { ozid: -837461, OTTid: 770315, picID: null, picID_src: null, picID_rating: null, picID_credit: null },
        { ozid: -837462, OTTid: 158484, picID: '12345678', picID_src: '99', picID_rating: 40000, picID_credit: null },
        { ozid: -837463, OTTid: 417950, picID: '27252520', picID_src: '99', picID_rating: 50000, picID_credit: null },
    ], "Removed 1 image");

    t.end();
});

test.onFinish(function() { 
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});
