/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_factory_midnode.js
  */
import { get_ozid } from './util_data_repo'
import { populate_factory } from './util_factory'
import data_repo from '../src/factory/data_repo.js';
import test from 'tape';

function um(res) {
  if (!res.lang) res.lang = "en-GB";
  ['leafIucn', 'leafPic', 'leaves', 'nodes', 'reservations', 'tours_by_ott', 'vernacular_by_name', 'vernacular_by_ott'].forEach((k) => {
    if (!res[k]) res[k] = [];
  });
  return data_repo.update_metadata(res)
}

test('sponsor_name,sponsor_kind,sponsor_extra', function (test) {
  var factory;
  function sponsor(node) {
    return {
      name: node.sponsor_name,
      kind: node.sponsor_kind,
      extra: node.sponsor_extra,
    };
  }

  return populate_factory().then((f) => {
    // Init data_repo & factory
    factory = f;

 }).then(() => {
   var node = factory.dynamic_loading_by_metacode(759126);

   test.deepEqual(sponsor(node), {
     name: undefined,
     kind: undefined,
     extra: undefined
   }, "No sponsorship initially");

   um({reservations: [
     // OTT_ID, verified_kind, verified_name, verified_more_info, verified_url
     [node.ott, "For", "Arthur Dent", "Don't panic", "https://example.com"],
   ]})
   test.deepEqual(sponsor(node), {
     name: 'Arthur Dent',
     kind: 'For',
     extra: 'Don\'t panic'
   }, "Updated metadata, got a sponsorship");

   node.release();
   node.metacode = 5;  // NB: Unless we change metacode, we'd just fetch the same metadata again
   test.deepEqual(sponsor(node), {
     name: undefined,
     kind: undefined,
     extra: undefined
   }, "Releasing cleared metadata");

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })

});

test('picset', function (test) {
  var factory;
  function picset(ozid) {
    var node = factory.dynamic_loading_by_metacode(ozid);
    var out = [];
    for (let i = 0; i < node.num_pics; i++) {
      out.push({
        ozid: node.ozid,
        ott: node.ott,
        picset_code: node.get_picset_code(i),
        picset_src_info: node.get_picset_src_info(i),
        picset_common: node.get_picset_common(i),
        picset_latin: node.get_picset_latin(i),
      });
    }
    return out;
  }

  return populate_factory().then((f) => {
    // Init data_repo & factory
    factory = f;

 }).then(() => {
    // Grab representative picset
    test.deepEqual(picset(759126), [
      { ozid: 759126, ott: 691846, picset_code: 1604804, picset_src_info: [ '3', '-26781256', null ], picset_common: 'Seven-spot ladybird', picset_latin: 'Coccinella septempunctata' },
      { ozid: 759126, ott: 691846, picset_code: 859495, picset_src_info: [ '99', '26864213', null ], picset_common: 'Black-headed Bunting', picset_latin: 'Emberiza melanocephala' },
      { ozid: 759126, ott: 691846, picset_code: 909997, picset_src_info: [ '99', '27480684', null ], picset_common: 'Common octopus', picset_latin: 'Octopus vulgaris' },
      { ozid: 759126, ott: 691846, picset_code: 761509, picset_src_info: [ '99', '13144803', null ], picset_common: 'Giant barrel sponge', picset_latin: 'Xestospongia muta' },
      { ozid: 759126, ott: 691846, picset_code: 766689, picset_src_info: [ '99', '27825566', null ], picset_common: 'Sea walnut', picset_latin: 'Mnemiopsis leidyi' },
      { ozid: 759126, ott: 691846, picset_code: 780665, picset_src_info: [ '99', '31356256', null ], picset_common: 'Cauliflower Coral', picset_latin: 'Pocillopora damicornis' },
      { ozid: 759126, ott: 691846, picset_code: 992201, picset_src_info: [ '99', '26864323', null ], picset_common: undefined, picset_latin: 'Caenorhabditis elegans' },
      { ozid: 759126, ott: 691846, picset_code: 1000050, picset_src_info: [ '99', '27736333', null ], picset_common: undefined, picset_latin: 'Hypsibius dujardini' },
    ]);

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })
});


test.onFinish(function() {
  // NB: Something data_repo includes in is holding node open.
  //     Can't find it so force our tests to end.
  process.exit(0)
});

