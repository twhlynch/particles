class Object {
    constructor(x, y, dx, dy, c) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.c = c;
    }
    move() {
        this.x += this.dx;
        this.y += this.dy;
        this.dy += 0.5;
    }
}

class Tree {
    constructor(boundary) {
        this.boundary = boundary;
        this.objects = [];
        this.divided = false;
    }

    subdivide() {
        let x = this.boundary.x;
        let y = this.boundary.y;
        let w = this.boundary.w / 2;
        let h = this.boundary.h / 2;

        this.northeast = new Tree({ x: x + w, y: y, w: w, h: h });
        this.northwest = new Tree({ x: x, y: y, w: w, h: h });
        this.southeast = new Tree({ x: x + w, y: y + h, w: w, h: h });
        this.southwest = new Tree({ x: x, y: y + h, w: w, h: h });

        this.divided = true;
    }

    insert(object) {
        if (!this.contains(object)) {
            return false;
        }

        if (this.objects.length < 4) {
            this.objects.push(object);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        if (this.northeast.insert(object) || this.northwest.insert(object) || 
            this.southeast.insert(object) || this.southwest.insert(object)) {
            return true;
        }

        return false;
    }

    contains(object) {
        return object.x > this.boundary.x &&
            object.x < this.boundary.x + this.boundary.w &&
            object.y > this.boundary.y &&
            object.y < this.boundary.y + this.boundary.h;
    }

    query(range, found = []) {
        if (!this.intersects(range)) {
            return found;
        }

        for (let obj of this.objects) {
            if (this.containsRange(obj, range)) {
                found.push(obj);
            }
        }

        if (this.divided) {
            this.northeast.query(range, found);
            this.northwest.query(range, found);
            this.southeast.query(range, found);
            this.southwest.query(range, found);
        }

        return found;
    }

    intersects(range) {
        return !(range.x > this.boundary.x + this.boundary.w ||
            range.x + range.w < this.boundary.x ||
            range.y > this.boundary.y + this.boundary.h ||
            range.y + range.h < this.boundary.y);
    }

    containsRange(object, range) {
        return object.x > range.x &&
            object.x < range.x + range.w &&
            object.y > range.y &&
            object.y < range.y + range.h;
    }
}

const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

let objects = [];

function addObject(x, y, dx, dy) {
    let c = [
        Math.random() * 100, Math.random() * 20 + 100, Math.random() * 20 + 100
    ];
    let o = new Object(x, y, dx, dy, c);
    objects.push(o);
}

let mouseDown = false;
let mousePos = { x: 0 , y: 0 };
canvas.addEventListener("mousedown", (event) => {
    mousePos.x = event.clientX;
    mousePos.y = event.clientY;
    mouseDown = true;
});
canvas.addEventListener("mouseup", (event) => {
    mouseDown = false;
});
canvas.addEventListener("mousemove", (event) => {
    mousePos.x = event.clientX;
    mousePos.y = event.clientY;
});
canvas.addEventListener("touchstart", (event) => {
    mousePos.x = event.touches[0].clientX;
    mousePos.y = event.touches[0].clientY;
    mouseDown = true;
});
canvas.addEventListener("touchend", (event) => {
    mouseDown = false;
});
canvas.addEventListener("touchmove", (event) => {
    mousePos.x = event.touches[0].clientX;
    mousePos.y = event.touches[0].clientY;
});

let deviceorientation = "";
try {
    let gyroscope = new Gyroscope({ frequency: 60 });
    gyroscope.addEventListener("reading", (e) => {
        deviceorientation = gyroscope.x + " " + gyroscope.y + " " + gyroscope.z;
    });
    gyroscope.start();
} catch (error) {
    console.error("Gyroscope not supported:", error);
}

let lastFrameTime = 0;
ctx.font = '10px Arial';
ctx.fillStyle = 'white';
function loop() {
    let tree = new Tree({ x: 0, y: 0, w: canvas.width, h: canvas.height });
    for (let o of objects) {
        tree.insert(o);
    }

    for (let o of objects) {
        let neighbors = tree.query({
            x: o.x - 1, 
            y: o.y - 1, 
            w: 3, 
            h: 3
        });

        for (let o2 of neighbors) {
            if (o === o2) continue;

            let dx = o.x - o2.x;
            let dy = o.y - o2.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) continue;
            
            let force = 0.05 * distance;
            let angle = Math.atan2(dy, dx);

            let fx = Math.cos(angle) * force;
            let fy = Math.sin(angle) * force;

            o.dx += fx;
            o.dy += fy;
            o2.dx -= fy;
            o2.dy -= fy
        }

        o.move();

        if (o.x < 0 && o.dx < 0) {
            o.dx = -o.dx * 0.9;
        } else if (o.x > canvas.width && o.dx > 0) {
            o.dx = -o.dx * 0.9;
        }

        if (o.y < 0 && o.dy < 0) {
            o.dy = -o.dy * 0.9;
        } else if (o.y > canvas.height && o.dy > 0) {
            o.dy = -o.dy * 0.9;
        }
    }

    if (mouseDown) {
        for (let i = 0; i < 33; i++) {
            let rad = Math.random() * Math.PI * 2;
            let d = Math.random() * 30;
            let x = Math.cos(rad) * d;
            let y = Math.sin(rad) * d;
            addObject(mousePos.x + x, mousePos.y + y, x / 30, y / 30);
        }
    }

    let imageData = new ImageData(canvas.width, canvas.height);
    for (let o of objects) {
        let color = o.c;
        
        let index = (Math.floor(o.x) + Math.floor(o.y) * canvas.width) * 4;

        if ( index >= 0 && index < canvas.height * canvas.width * 4 - 4) {
            imageData.data.set([
                color[0], color[1], color[2], 255,
            ], index);
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);

    ctx.fillText(`FPS: ${Math.round(1000 / (performance.now() - lastFrameTime))}`, 5, 10);
    ctx.fillText(`Objects: ${objects.length}`, 5, 25);
    ctx.fillText(`Device: ${deviceorientation}`, 5, 40);

    lastFrameTime = performance.now();

    requestAnimationFrame(loop);
}

loop();