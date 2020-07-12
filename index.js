function getLen(v) {
    if (isNaN(v.x) || isNaN(v.y)) {
        return 0
    } else {
        return Math.sqrt(v.x * v.x + v.y * v.y)
    }
}

function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y
}

function getAngle(v1, v2) {
    const mr = getLen(v1) * getLen(v2)
    if (mr === 0) return 0
    let r = dot(v1, v2) / mr
    if (r > 1) r = 1
    return Math.acos(r)
}

function cross(v1, v2) {
    return v1.x * v2.y - v2.x * v1.y
}

function getRotateAngle(v1, v2) {
    let angle = getAngle(v1, v2)
    if (cross(v1, v2) > 0) {
        angle *= -1
    }
    return angle * 180 / Math.PI
}

const vueOnTouch = {}
vueOnTouch.install = function (Vue) {
    let self = this
    self.config = {
        preV: {x: null, y: null},
        pinchStartLen: null,
        scale: 1,
        isDoubleTap: false,
        touchStart: function () { },
        touchMove: function () {},
        touchEnd: function () {},
        touchCancel: function () {},
        tap: function () {},
        singleTap: function () {},
        longTap: function () {},
        doubleTap: function () {},
        pressMove: function () {},
        multipointStart: function () {},
        multipointEnd: function () {},
        swipe: function () {},
        pinch: function () {},
        rotate: function () {},
        delta: null,
        last: null,
        now: null,
        tapTimeout: null,
        touchTimeout: null,
        longTapTimeout: null,
        swipeTimeout: null,
        x1: null,
        x2: null,
        y1: null,
        y2: null,
        preTapPosition: {x: null, y: null}
    }
    self.start = function (e) {
        if (!e.touches) return
        e.preventDefault()
        self.config.now = Date.now()
        self.config.x1 = e.touches[0].pageX
        self.config.y1 = e.touches[0].pageY
        self.config.delta = self.config.now - (self.config.last || self.config.now)
        self.config.touchStart(e)
        if (self.config.preTapPosition.x !== null) {
            self.config.isDoubleTap = (self.config.delta > 0 && self.config.delta <= 250 &&
                Math.abs(self.config.preTapPosition.x - self.config.x1) < 30 &&
                Math.abs(self.config.preTapPosition.y - self.config.y1) < 30)
        }
        self.config.preTapPosition.x = self.config.x1
        self.config.preTapPosition.y = self.config.y1
        self.config.last = self.config.now
        let preV = self.config.preV
        let len = e.touches.length
        if (len > 1) {
            self._cancelLongTap()
            let v = {x: e.touches[1].pageX - self.config.x1, y: e.touches[1].pageY - self.config.y1}
            preV.x = v.x
            preV.y = v.y
            self.config.pinchStartLen = getLen(preV)
            self.config.multipointStart(e)
        }
        self.config.longTapTimeout = setTimeout(function () {
            self.config.longTap(e)
        }, 750)
    }
    self.move = function (e) {
        if (!e.touches) return
        e.preventDefault()
        let preV = self.config.preV
        let len = e.touches.length
        let currentX = e.touches[0].pageX
        let currentY = e.touches[0].pageY
        self.config.isDoubleTap = false
        if (len > 1) {
            let v = {x: e.touches[1].pageX - currentX, y: e.touches[1].pageY - currentY}
            if (preV.x !== null) {
                if (self.config.pinchStartLen > 0) {
                    e.scale = getLen(v) / self.config.pinchStartLen
                    self.config.pinch(e)
                }
                e.angle = getRotateAngle(v, preV)
                self.config.rotate(e)
            }
            preV.x = v.x
            preV.y = v.y
        } else {
            if (self.config.x2 !== null) {
                e.deltaX = currentX - self.config.x2
                e.deltaY = currentY - self.config.y2
            } else {
                e.deltaX = 0
                e.deltaY = 0
            }
            self.config.pressMove(e)
        }
        self.config.touchMove(e)
        self._cancelLongTap()
        self.config.x2 = currentX
        self.config.y2 = currentY
        if (e.touches.length > 1) {
            self._cancelLongTap()
            e.preventDefault()
        }
    }
    self.end = function (e) {
        if (!e.touches) return
        e.preventDefault()
        self._cancelLongTap()
        if (e.touches.length < 2) {
            self.config.multipointEnd(e)
        }
        self.config.touchEnd(e)
        // swipe
        if ((self.config.x2 && Math.abs(self.config.x1 - self.config.x2) > 30) ||
            (self.config.y2 && Math.abs(self.config.preV.y - self.config.y2) > 30)) {
            e.direction = self._swipeDirection(self.config.x1, self.config.x2, self.config.y1, self.config.y2)
            self.config.swipeTimeout = setTimeout(function () {
                self.config.swipe(e)
            }, 0)
        } else {
            self.config.tapTimeout = setTimeout(function () {
                self.config.tap(e)
                // trigger double tap immediately
                if (self.config.isDoubleTap) {
                    self.config.doubleTap(e)
                    clearTimeout(self.config.touchTimeout)
                    self.config.isDoubleTap = false
                } else {
                    self.config.touchTimeout = setTimeout(function () {
                        self.config.singleTap(e)
                    }, 200)
                }
            }, 0)
        }
        self.config.preV.x = 0
        self.config.preV.y = 0
        self.config.scale = 1
        self.config.pinchStartLen = null
        self.config.x1 = self.config.x2 = self.config.y1 = self.config.y2 = null
    }
    self.cancel = function (e) {
        clearTimeout(self.config.touchTimeout)
        clearTimeout(self.config.tapTimeout)
        clearTimeout(self.config.longTapTimeout)
        clearTimeout(self.config.swipeTimeout)
        self.config.touchCancel(e)
    }
    self._cancelLongTap = function () {
        clearTimeout(self.config.longTapTimeout)
    }
    self._swipeDirection = function (x1, x2, y1, y2) {
        return Math.abs(x1 - x2) >= Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
    }

    function handleBind(el, binding, callback) {
        self.config[callback.name] = function (e) {
            binding.value.call(binding.value, e)
        }
        el.addEventListener('touchstart', self.start, false)
        el.addEventListener('touchmove', self.move, false)
        el.addEventListener('touchend', self.end, false)
        el.addEventListener('touchcancel', self.cancel, false)
    }
    // 自定义指令
    Vue.directive('onTap', {
        bind(el, binding) {
            handleBind(el, binding, self.config.tap)
        }
    })

    Vue.directive('onSingleTap', {
        bind(el, binding) {
            handleBind(el, binding, self.config.singleTap)
        }
    })

    Vue.directive('onDoubleTap', {
        bind(el, binding) {
            handleBind(el, binding, self.config.doubleTap)
        }
    })

    Vue.directive('onLongTap', {
        bind(el, binding) {
            handleBind(el, binding, self.config.longTap)
        }
    })

    Vue.directive('onPressMove', {
        bind(el, binding) {
            handleBind(el, binding, self.config.pressMove)
        }
    })

    Vue.directive('onMultipointStart', {
        bind(el, binding) {
            handleBind(el, binding, self.config.multipointStart)
        }
    })

    Vue.directive('onMultipointEnd', {
        bind(el, binding) {
            handleBind(el, binding, self.config.multipointEnd)
        }
    })

    Vue.directive('onSwipe', {
        bind(el, binding) {
            handleBind(el, binding, self.config.swipe)
        }
    })

    Vue.directive('onPinch', {
        bind(el, binding) {
            handleBind(el, binding, self.config.pinch)
        }
    })

    Vue.directive('onRotate', {
        bind(el, binding) {
            handleBind(el, binding, self.config.rotate)
        }
    })
}
export default vueOnTouch
