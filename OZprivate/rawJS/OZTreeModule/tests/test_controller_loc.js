import { get_location3 } from '../src/controller/controller_loc';
import { mk_node } from './util_midnode_mock';
import test from 'tape';

const width = 1000, height = 800;

/**
 * A node as re_calc leaves it: its circle -- the joint or leaf blob at the end of its branch,
 * i.e. the node itself -- is drawn (r) wide centred on (x, y).
 *
 * (dvar) says the node or something below it is drawn, its branches included, and so says
 * nothing about whether the node itself ended up anywhere near the view.
 */
function mk_loc_node(cname, { x = -9000, y = 400, r = 100, dvar = true, children = [] }) {
  return mk_node({
    cname: cname,
    metacode: cname ? 'ozid_' + cname : 'ozid_anon',
    richness_val: children.length ? 1000 : 100,
    children: children,
    has_child: children.length > 0,
    gvar: true,
    dvar: dvar,
    // Put the node's origin on its own circle and scale its space so the circle comes out r
    // wide, i.e. rvar carries the node's size as it does in the real tree
    xvar: x, yvar: y, rvar: r,
    arcx: 0, arcy: 0, arcr: 1 / 1.305,  // 1.305 = the leaf-point allowance, see midnode
  });
}

// A node whose circle is off screen: all that is in the view is the branch passing through it
const offscreen = { x: -9000 };
// A node whose circle is in the middle of the screen
const onscreen = { x: 500, y: 400 };
// A child with nothing of it on screen, so it neither carries the path on nor forks it: just
// enough to make its parent an interior node rather than a leaf
const undrawn_child = () => mk_loc_node('Undrawn', { dvar: false });

test('get_location3: walks down to where the view sits', function (t) {
  // A chain of named ancestors, all of them drawn only as branches crossing the view, ending
  // at a node we can actually see
  const here = mk_loc_node('Bat', { ...onscreen, children: [
    mk_loc_node('Fruit bat', { ...offscreen, dvar: false }),
  ] });
  const root = mk_loc_node('Life', { ...offscreen, children: [
    mk_loc_node('Mammal', { ...offscreen, children: [here] }),
  ] });

  const [names, metacodes, found] = get_location3(root, width, height);
  t.deepEqual(names, ['Life', 'Mammal', 'Bat'], 'Path runs from the root to the node in the view');
  t.deepEqual(metacodes, ['ozid_Life', 'ozid_Mammal', 'ozid_Bat'], 'Metacodes match the names');
  t.equal(found, true, 'Path was found');

  t.end();
});

test('get_location3: stops where the view forks', function (t) {
  // Both children have something of them on screen, so the view spans the pair of them and
  // their parent is as deep as it goes
  const parent = mk_loc_node('Bat', { ...offscreen, children: [
    mk_loc_node('Fruit bat', { ...offscreen, children: [undrawn_child()] }),
    mk_loc_node('Vesper bat', { ...offscreen, children: [undrawn_child()] }),
  ] });
  const root = mk_loc_node('Life', { ...offscreen, children: [parent] });

  t.deepEqual(
    get_location3(root, width, height)[0], ['Life', 'Bat'],
    'Path stops at the common ancestor of the 2 children in view',
  );

  // With one of the pair off screen entirely, the walk carries on into the other
  parent.children[1].dvar = false;
  t.deepEqual(
    get_location3(root, width, height)[0], ['Life', 'Bat', 'Fruit bat'],
    'Path continues while a single child holds the whole view',
  );

  // A leaf counts as a fork like any other child: the view spans it as well as its sibling,
  // so the pair's parent is still the deepest node holding all of it
  parent.children[1] = mk_loc_node('Vesper bat', { ...offscreen });
  t.equal(parent.children[1].has_child, false, 'The forking sibling is a leaf');
  t.deepEqual(
    get_location3(root, width, height)[0], ['Life', 'Bat'],
    'Path stops where the view forks between a leaf and its sibling',
  );

  t.end();
});

test('get_location3: does not end early on a branch crossing the view', function (t) {
  // The ancestor is drawn -- its branch sweeps through the view -- but the node itself is far
  // outside it, so it is not where the viewer is
  const deep = mk_loc_node('Fruit bat', { ...onscreen, children: [undrawn_child()] });
  const root = mk_loc_node('Life', { ...offscreen, children: [
    mk_loc_node('Bat', { ...offscreen, children: [deep] }),
  ] });

  t.deepEqual(
    get_location3(root, width, height)[0], ['Life', 'Bat', 'Fruit bat'],
    'Ancestor drawn only as a passing branch does not end the path',
  );

  // Bring that ancestor's own circle into the view and it does end the path
  root.children[0].xvar = 500;
  t.deepEqual(
    get_location3(root, width, height)[0], ['Life', 'Bat'],
    'Ancestor whose own circle is in the view ends the path',
  );

  t.end();
});

test('get_location3: gives one more richness than there are names', function (t) {
  // update_location_menu draws each name against the richness of what lies below it, reading
  // richness[i + 1] for name[i], so the last name needs a richness after it
  const here = mk_loc_node('Bat', { ...onscreen, children: [undrawn_child()] });
  const root = mk_loc_node('Life', { ...offscreen, children: [here] });
  here.richness_val = 40;
  root.richness_val = 900;

  const [names, metacodes, , richness] = get_location3(root, width, height);
  t.equal(
    richness.length, names.length + 1,
    'One richness per name, plus the richness of the node the path ends at',
  );
  t.equal(richness.length, metacodes.length + 1, 'Metacodes are the same length as names');
  t.deepEqual(richness, [900, 40, 40], 'Ends with the richness of where the path stopped');
  t.ok(
    names.every((_, i) => !isNaN(richness[i + 1] / richness[i])),
    'Every name has a richness proportion that is a number',
  );

  t.end();
});

test('get_location3: skips unnamed nodes but still ends on their richness', function (t) {
  // An unnamed node is no use as a menu entry, but if the path ends on one its richness is
  // still what the last name should be drawn against
  const anon = mk_loc_node(null, { ...onscreen, children: [undrawn_child()] });
  const root = mk_loc_node('Life', { ...offscreen, children: [anon] });
  anon.richness_val = 12;
  root.richness_val = 900;

  const [names, , , richness] = get_location3(root, width, height);
  t.deepEqual(names, ['Life'], 'Unnamed node is left out of the path');
  t.deepEqual(richness, [900, 12], 'Its richness still closes the array off');

  t.end();
});

test('get_location3: stops short of a leaf', function (t) {
  // update_location_menu turns each entry into a link with '@_ozid=' + metacode, and a leaf's
  // ozid is its negated metacode (see factory/midnode), so a leaf in the path would link to
  // a different, interior node. The walk ends on the leaf's parent instead
  const leaf = mk_loc_node('Fruit bat', { ...onscreen });
  const root = mk_loc_node('Life', { ...offscreen, children: [
    mk_loc_node('Bat', { ...offscreen, children: [leaf] }),
  ] });

  t.equal(leaf.has_child, false, 'The node in the view is a leaf');
  t.deepEqual(
    get_location3(root, width, height)[0], ['Life', 'Bat'],
    'Path ends on the leaf\'s parent, the deepest node its metacode is an ozid for',
  );

  t.end();
});

test('get_location3: gives nothing for a tree that is not drawn', function (t) {
  const root = mk_loc_node('Life', { ...offscreen, dvar: false });

  t.deepEqual(
    get_location3(root, width, height), [[], [], false, []],
    'Nothing of the tree on screen, so no path',
  );

  t.end();
});
