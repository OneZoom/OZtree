/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_factory_midnode.js
  */
import { get_ozid } from './util_data_repo'
import { populate_factory } from './util_factory'
import data_repo from '../src/factory/data_repo.js';
// NB: midnode.js is part of an import cycle rooted at data_repo, so has to come after it
import Midnode from '../src/factory/midnode.js';
import test from 'tape';

/**
 * A node's branch as plain arrays, so it can be compared in one go: the start point as
 * [x, y], every point after it as [cp1x, cp1y, cp2x, cp2y, x, y]
 */
function branch(node) {
  return node.branch_points.map((p, i) => i === 0 ?
    [p.x, p.y] :
    [p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y]);
}

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

  }).then(function () {
    test.end();
  }).catch(function (err) {
    console.log(err.stack);
    test.fail(err);
    test.end();
  })

});

test('tours', function (test) {
  var factory;

  return populate_factory().then((f) => {
    // Init data_repo & factory
    factory = f;

 }).then(() => {
   var node = factory.dynamic_loading_by_metacode(759126);

   test.deepEqual(node.tours, []);
   um({tours_by_ott: [
     // OTT_ID, verified_kind, verified_name, verified_more_info, verified_url
     [node.ott, ["ut::tour1"]],
   ]})
   test.deepEqual(node.tours, ["ut::tour1"]);

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

test('branch_restart,branch_point,branch_end', function (test) {
  let node = new Midnode();

  test.equal(node.branch_points, undefined, "No branch until one is started");

  // A branch begins as just its start point, sat at the node's own origin
  let sp = node.branch_restart();
  test.deepEqual(branch(node), [[0, 0]], "Started a branch");
  test.equal(sp, node.branch_start, "branch_restart() returned the point to fill in");
  test.throws(() => node.branch_end, /does not have an end/, "A branch of only a start point has no end yet");

  // Extend it by filling in each point branch_point() hands back
  let p1 = node.branch_point();
  p1.cp1x = 1; p1.cp1y = 2; p1.cp2x = 3; p1.cp2y = 4; p1.x = 5; p1.y = 6;
  let p2 = node.branch_point();
  p2.cp1x = 7; p2.cp1y = 8; p2.cp2x = 9; p2.cp2y = 10; p2.x = 11; p2.y = 12;
  test.deepEqual(branch(node), [
    [0, 0],
    [1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12],
  ], "A path of as many cubic segments as we asked for");
  test.equal(node.branch_end, p2, "branch_end is the last point of the path");

  // Move the start point away from the origin, so we can see it reset
  sp.x = 0.5; sp.y = 0.5;

  // Starting again empties the path back to its start point
  test.equal(node.branch_restart(), sp, "Restarting re-uses the same start point object");
  test.deepEqual(branch(node), [[0, 0]], "...moved back to the origin, rest of the path dropped");
  test.throws(() => node.branch_end, /does not have an end/, "...so there's no end to the branch again");

  // The dropped points are handed out again rather than reallocated
  test.equal(node.branch_point(), p1, "Dropped points are recycled");
  test.deepEqual(branch(node), [
    [0, 0],
    [0, 0, 0, 0, 0, 0],
  ], "...zeroed out, not still carrying the old values");
  test.equal(node.branch_point(), p2, "Recycled in the order they were added");

  // Any more than that and we have to allocate again
  let p3 = node.branch_point();
  test.ok(p3 !== p1 && p3 !== p2, "A fresh point once the recycled ones run out");
  test.deepEqual(branch(node), [
    [0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ], "3 blank segments");

  test.end();
});

test('branch_start', function (test) {
  let node = new Midnode();

  // branch_start is the point branch_restart() hands out, sat at the node's own origin
  let sp = node.branch_restart();
  test.equal(node.branch_start, sp, "branch_start is the point branch_restart() returned");
  test.deepEqual([node.branch_start.x, node.branch_start.y], [0, 0], "A branch starts at the origin");

  // It reads back whatever the caller filled in
  sp.x = 3; sp.y = 4;
  test.deepEqual([node.branch_start.x, node.branch_start.y], [3, 4], "Reads back what we filled in");

  // Extending the path moves the end of the branch on, but not the start of it
  let p1 = node.branch_point();
  test.equal(node.branch_start, sp, "Still the same point once the path is extended");
  test.equal(node.branch_end, p1, "...whilst branch_end has moved on");

  // Restarting resets it in place, rather than replacing it
  test.equal(node.branch_restart(), node.branch_start, "Restarting hands back branch_start again");
  test.deepEqual([node.branch_start.x, node.branch_start.y], [0, 0], "...back at the origin");

  // A cubic sets it from the sx/sy it was given
  node.branch_cubic({
    sx: 1, sy: 2,
    cp1x: 3, cp1y: 4,
    cp2x: 5, cp2y: 6,
    ex: 7, ey: 8,
  });
  test.deepEqual([node.branch_start.x, node.branch_start.y], [1, 2], "branch_cubic() starts the curve at sx/sy");

  test.end();
});

test('branch_cubic', function (test) {
  let node = new Midnode();

  node.branch_cubic({
    sx: 1, sy: 2,
    cp1x: 3, cp1y: 4,
    cp2x: 5, cp2y: 6,
    ex: 7, ey: 8,
  });
  test.deepEqual(branch(node), [
    [1, 2],
    [3, 4, 5, 6, 7, 8],
  ], "A branch of a single cubic segment");
  test.deepEqual([node.branch_end.x, node.branch_end.y], [7, 8], "branch_end is where the curve ends");

  // Re-laying out a node replaces its curve rather than adding to it
  node.branch_cubic({
    sx: 0, sy: 0,
    cp1x: 0, cp1y: -0.05,
    cp2x: 0, cp2y: -0.95,
    ex: 0, ey: -1,
  });
  test.deepEqual(branch(node), [
    [0, 0],
    [0, -0.05, 0, -0.95, 0, -1],
  ], "Still a single segment, with none of the old values left");

  // ...however long the branch it's replacing was
  node.branch_point();
  node.branch_point();
  test.equal(node.branch_points.length, 4, "Extended the branch");
  node.branch_cubic({
    sx: 1, sy: 1,
    cp1x: 1, cp1y: 1,
    cp2x: 1, cp2y: 1,
    ex: 1, ey: 1,
  });
  test.deepEqual(branch(node), [
    [1, 1],
    [1, 1, 1, 1, 1, 1],
  ], "Cut back down to a single segment");

  test.end();
});


