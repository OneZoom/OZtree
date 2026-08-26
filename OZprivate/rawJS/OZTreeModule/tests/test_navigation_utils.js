import { get_largest_visible_node } from '../src/navigation/utils';
import { mk_node } from './util_midnode_mock';
import test from 'tape';

const width = 1000, height = 800;

/**
 * A node as re_calc leaves it, in terms of what a viewer sees: its circle -- the joint or
 * leaf blob at the end of its branch -- is drawn (r) wide centred on (x, y).
 *
 * (gvar) says some part of the node's graphics is on screen, its branch included, and so may
 * be true when the circle itself is nowhere near the view: a branch can sweep a long way from
 * the node it belongs to. (dvar) says the same of the node or anything below it. Neither says
 * anything about where the node itself ended up, which is what the search is looking for.
 */
function mk_visible_node(name, { x, y, r = 10, gvar = true, dvar = true, children = [] }) {
  return mk_node({
    name: name,
    children: children,
    gvar: gvar,
    dvar: dvar,
    // Put the node's origin on its own circle and scale its space so the circle comes out r
    // wide, i.e. rvar carries the node's size as it does in the real tree
    xvar: x, yvar: y, rvar: r,
    arcx: 0, arcy: 0, arcr: 1 / 1.305,  // 1.305 = the leaf-point allowance, see midnode
    // Node-and-descendants box, used to rank 2 candidates that are both in the view
    hxmin: -1, hxmax: 1, hymin: -1, hymax: 1,
  });
}

test('get_largest_visible_node: prefers a node in the view to an ancestor crossing it', function (t) {
  // An ancestor drawn as a branch sweeping through the view, its own circle far off to the
  // left, above a child sitting in the middle of the screen
  const child = mk_visible_node('child', { x: 500, y: 400, r: 20 });
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, children: [child] });

  t.equal(
    get_largest_visible_node(root, width, height).name, 'child',
    "Ancestor's circle is off screen, so the child in the view wins",
  );

  // The same, with the ancestor's circle brought into the view: now it is the answer, being
  // both in the view and the larger of the 2
  root.xvar = 500;
  t.equal(
    get_largest_visible_node(root, width, height).name, 'root',
    "Ancestor's own circle in the view is returned without looking further down",
  );

  t.end();
});

test('get_largest_visible_node: picks the largest of the nodes in the view', function (t) {
  // 3 nodes in the view at once, the largest listed neither first nor last so that child
  // order can't be what decides it
  const small = mk_visible_node('small', { x: 200, y: 400, r: 10 });
  const large = mk_visible_node('large', { x: 500, y: 400, r: 90 });
  const medium = mk_visible_node('medium', { x: 800, y: 400, r: 40 });
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, children: [small, large, medium] });

  t.equal(
    get_largest_visible_node(root, width, height).name, 'large',
    'Largest node in the view wins wherever it sits among its siblings',
  );

  // Only the part on screen counts: the big node is now mostly off the left edge, leaving
  // less of itself in the view than the small one has of its own
  large.xvar = -60;
  t.equal(
    get_largest_visible_node(root, width, height).name, 'medium',
    'Node mostly off screen loses to a smaller one wholly in the view',
  );

  t.end();
});

test('get_largest_visible_node: searches the whole tree, not just the top of it', function (t) {
  // 2 subtrees, the node in the view several levels down the second of them
  const buried = mk_visible_node('buried', { x: 500, y: 400, r: 15 });
  const branch_a = mk_visible_node('branch_a', { x: -9000, y: 400, r: 200, children: [
    mk_visible_node('a_child', { x: -9000, y: 400, r: 100, dvar: false }),
  ] });
  const branch_b = mk_visible_node('branch_b', { x: -9000, y: 400, r: 200, children: [
    mk_visible_node('b_child', { x: -9000, y: 400, r: 100, children: [buried] }),
  ] });
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, children: [branch_a, branch_b] });

  t.equal(
    get_largest_visible_node(root, width, height).name, 'buried',
    'Node in the view is found however deep it is, and beats larger ancestors outside it',
  );

  t.end();
});

test('get_largest_visible_node: falls back to a branch passing through the view', function (t) {
  // Nothing below is drawn and our own circle is off screen: all that is in the view is our
  // branch, so we are still the best answer available
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, dvar: false });

  t.equal(
    get_largest_visible_node(root, width, height).name, 'root',
    'Node with only its branch in the view is returned when there is nothing better',
  );

  // A node in the view beats a fallback from another subtree, however much larger the
  // fallback is: being in the view at all outranks being big
  const fallback = mk_visible_node('fallback', { x: -9000, y: 400, r: 400, dvar: false });
  const in_view = mk_visible_node('in_view', { x: 500, y: 400, r: 5, dvar: false });
  const parent = mk_visible_node('parent', { x: 9000, y: 400, r: 500, children: [fallback, in_view] });

  t.equal(
    get_largest_visible_node(parent, width, height).name, 'in_view',
    'A small node in the view beats a large branch-only fallback',
  );

  t.end();
});

test('get_largest_visible_node: always finds something in a drawn tree', function (t) {
  // Callers such as tour/Tour use the result without checking it, so a tree with anything
  // drawn at all has to yield a node even when no circle in it is in the view
  const child = mk_visible_node('child', { x: -9000, y: 400, r: 100, dvar: false });
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, children: [child] });

  t.ok(
    get_largest_visible_node(root, width, height),
    'Tree drawn as branches alone still yields a node rather than null',
  );

  t.end();
});

test('get_largest_visible_node: honours the condition', function (t) {
  const named = mk_visible_node('named', { x: 400, y: 400, r: 10 });
  const bigger = mk_visible_node('bigger', { x: 600, y: 400, r: 50 });
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, children: [named, bigger] });
  named.cname = 'Pangolin';

  t.equal(
    get_largest_visible_node(root, width, height).name, 'bigger',
    'Without a condition the largest node in the view wins',
  );
  t.equal(
    get_largest_visible_node(root, width, height, (n) => !!n.cname).name, 'named',
    'With a condition, the largest matching node in the view wins',
  );
  t.equal(
    get_largest_visible_node(root, width, height, (n) => n.name === 'nonesuch'), null,
    'Nothing matches the condition, so no node is returned',
  );

  t.end();
});

test('get_largest_visible_node: ignores nodes that are not drawn', function (t) {
  // gvar false: the node isn't on screen at all, so its xvar/yvar/rvar may be left over from
  // an earlier frame, and the circle they put in the view counts for nothing
  const stale = mk_visible_node('stale', { x: 500, y: 400, r: 20, gvar: false, dvar: false });
  const root = mk_visible_node('root', { x: -9000, y: 400, r: 300, children: [stale] });

  t.equal(
    get_largest_visible_node(root, width, height).name, 'root',
    'Undrawn node is passed over in favour of the ancestor that is drawn',
  );

  // The search doesn't reach an undrawn subtree in the first place: dvar says there is
  // nothing below worth walking into, whatever the nodes there still have set on them
  root.dvar = false;
  t.equal(
    get_largest_visible_node(root, width, height).name, 'root',
    'Subtree marked as not drawn is not descended into',
  );

  t.end();
});
