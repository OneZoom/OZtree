Interactor
--------

This module binds a canvas with mouse, touch, keyboard listeners. It detects what kind of interaction it is, then call projection to update position of the tree and then call renderer to repaint the canvas.

Module Interface:

  1. bind_listener
    * Canvas -> Null
    * Bind mouse touch and keyboard listeners on canvas.