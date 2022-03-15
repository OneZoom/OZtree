import {pre_calc, set_pre_calculator} from '../src/projection/pre_calc/pre_calc';
import test from 'tape';
import almostEqual from 'almost-equal';

test('pre_calc', function (t) {
    let root = {
        richness_val: 1,
        has_child: true,
        children: [
            { richness_val: 0.3 },
            { richness_val: 0.7 },
        ],
        nextr: [],
        nextx: [],
        nexty: [],
    };

    set_pre_calculator('balanced');
    pre_calc(root, true);
    t.deepEqual(root.nextr, [0.61, 0.61]);
    t.ok(almostEqual(root.nextx[0], -0.10725000000000025));
    t.ok(almostEqual(root.nextx[1], 0.10724999999999978));
    t.ok(almostEqual(root.nexty[0], -1.3));
    t.ok(almostEqual(root.nexty[1], -1.3));
    t.ok(almostEqual(root.bezsx, 0));
    t.ok(almostEqual(root.bezsy, 0));
    t.ok(almostEqual(root.bezex, 0));
    t.ok(almostEqual(root.bezey, -1));
    t.ok(almostEqual(root.bezc1x, 0));
    t.ok(almostEqual(root.bezc1y, -0.05));
    t.ok(almostEqual(root.bezc2x, 0));
    t.ok(almostEqual(root.bezc2y, -0.95));
    t.ok(almostEqual(root.bezr, 0.55));
    t.ok(almostEqual(root.arca, 4.71238898038469));
    t.ok(almostEqual(root.arcx, 0));
    t.ok(almostEqual(root.arcy, -1.01));
    t.ok(almostEqual(root.arcr, 0.275));

    t.ok(almostEqual(root.children[0].bezc1x, -3.0114265552803764e-17));
    t.ok(almostEqual(root.children[0].bezc1y, -0.1639344262295082));
    t.ok(almostEqual(root.children[1].bezc1x, 6.022853110560753e-17));
    t.ok(almostEqual(root.children[1].bezc1y, 0.3278688524590164));

    // Swap children around, bezc1 moves
    root.children = [
            { richness_val: 0.7 },
            { richness_val: 0.3 },
    ];
    pre_calc(root, true);
    t.ok(almostEqual(root.children[0].bezc1x, 9.034279665841129e-17));
    t.ok(almostEqual(root.children[0].bezc1y, 0.4918032786885246));
    t.ok(almostEqual(root.children[1].bezc1x, -3.0114265552803764e-17));
    t.ok(almostEqual(root.children[1].bezc1y, -0.1639344262295082));

    t.end();
});
