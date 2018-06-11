"use strict";

var tints = [
     [ 70,  45,  43],
     [128, 255, 255],
     [128, 128, 255],
     [255, 128, 255],
     [255, 255, 128],
];

function rand_int(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/** SVG node with image tinted by (tint) */
function tinted_image(image_href, tint, top, left, size) {
    var el = document.createElement('DIV');
    el.innerHTML = [
        '<svg>',
        '<defs>',
        '<filter id="tint' + tint[0] + tint[1] + tint[2] + tint[3] + '"  x="0%" y="0%" height="100%" width="100%">',
        '<feColorMatrix',
            ' type="matrix"',
            ' values="',
                (tint[0] / 256) + ' 0 0 0 0 0 ',
                (tint[1] / 256) + ' 0 0 0 0 0 ',
                (tint[2] / 256) + ' 0 0 0 0 0 ',
                (tint[3] || '0.8') + ' 0"/>',
        '</filter>',
        '</defs>',
        '<g filter="url(#tint' + tint[0] + tint[1] + tint[2] + tint[3] + ')" >',
        '<image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="', image_href, '" x="0" y="0" width="100%" height="100%" />',
        '</g>',
        '</svg>',
    ].join("");
    el = el.children[0];
    
    el.style.position = 'absolute';
    el.style.width = size + '%';
    el.style.height = size + '%';
    el.style.top = top + '%';
    el.style.left = left + '%';

    return el;
}

function translate_tree(background_el, url, tint) {
    var el = tinted_image(url, tint, rand_int(0, 20), rand_int(-50, 40), 90);

    el.style.opacity = 0;
    background_el.appendChild(el);

    window.setTimeout(function () {
        el.style.opacity = 1;
        el.style.transform = 'translate3d(' +
            rand_int(-20,20) + 'px,' +
            rand_int(-20,20) + 'px,' +
            rand_int(-20,20) + 'px) rotate3d(0, 1, 0, ' + rand_int(-20, 20) + 'deg)';
    }, 50);

    window.setTimeout(function () {
        el.style.opacity = 0;
    }, 10000);

    window.setTimeout(function () {
        background_el.removeChild(el);
    }, 30000);
}

function show_particles(background_el, url) {
    var start_rotate = rand_int(0, 360),
        el = tinted_image(url, [255, 255, 255], rand_int(-15, -5), rand_int(-15, -5), 120);

    el.style.opacity = 0;
    el.style.transform = 'perspective(2000px) rotateX(10deg) rotateZ(' + start_rotate + 'deg)';
    background_el.appendChild(el);

    window.setTimeout(function () {
        el.style.opacity = 1;
        el.style.transform = 'perspective(2000px) rotateX(10deg) rotateZ(' + (start_rotate + 3*rand_int(-5, 5)) + 'deg)';
    }, 50);

    window.setTimeout(function () {
        el.style.opacity = 0;
    }, 10000);

    window.setTimeout(function () {
        background_el.removeChild(el);
    }, 30000);
}

function animation_change(background_el, images) {
    function choose_image(t) {
        return images[t][rand_int(0, images[t].length - 1)];
    }

    if (Math.random() < 0.3) {
        translate_tree(background_el, choose_image('tree'), tints[rand_int(0, tints.length - 1)]);
    }

    if (Math.random() < 0.3) {
        show_particles(background_el, choose_image('particle'));
    }
    
    window.setTimeout(animation_change.bind(null, background_el, images), 3000);
}

function init_background(images) {
    var background_el = document.createElement('DIV');

    background_el.className = 'background-layer';
    document.body.insertBefore(background_el, document.body.firstChild);
    animation_change(background_el, images);
}
