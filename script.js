const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");

// Сглаживание углов
let smoothAngles = {
  a1: null,
  a2: null,
  a3: null
};

const SMOOTH_FACTOR = 0.2;

// Соединения точек (скелет руки)
const connections = [
  [0,1],[1,2],[2,3],[3,4],       // большой палец
  [0,5],[5,6],[6,7],[7,8],       // указательный
  [0,9],[9,10],[10,11],[11,12],  // средний
  [0,13],[13,14],[14,15],[15,16],// безымянный
  [0,17],[17,18],[18,19],[19,20] // мизинец
];

// Камера
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

// Вектор
function getVector(p1, p2) {
  return {
    x: p2[0] - p1[0],
    y: p2[1] - p1[1]
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function angleBetween(a, b) {
  const cos = dot(a, b) / (length(a) * length(b));
  return Math.acos(cos) * (180 / Math.PI);
}

// Сглаживание
function smooth(prev, current) {
  if (prev === null) return current;
  return prev * (1 - SMOOTH_FACTOR) + current * SMOOTH_FACTOR;
}

// Рисование линий
function drawConnections(landmarks) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 3;

  connections.forEach(([i, j]) => {
    ctx.beginPath();
    ctx.moveTo(landmarks[i][0], landmarks[i][1]);
    ctx.lineTo(landmarks[j][0], landmarks[j][1]);
    ctx.stroke();
  });
}

// Основная логика
async function main() {
  await setupCamera();
  video.play();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const model = await handpose.load();

  async function detect() {
    const predictions = await model.estimateHands(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);

    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;

      // Векторы пальцев
      const index = getVector(landmarks[5], landmarks[8]);
      const middle = getVector(landmarks[9], landmarks[12]);
      const ring = getVector(landmarks[13], landmarks[16]);
      const pinky = getVector(landmarks[17], landmarks[20]);

      // Сырые углы
      const raw1 = angleBetween(index, middle);
      const raw2 = angleBetween(middle, ring);
      const raw3 = angleBetween(ring, pinky);

      // Сглаживание
      smoothAngles.a1 = smooth(smoothAngles.a1, raw1);
      smoothAngles.a2 = smooth(smoothAngles.a2, raw2);
      smoothAngles.a3 = smooth(smoothAngles.a3, raw3);

      output.innerHTML = `
        Index-Middle: ${smoothAngles.a1.toFixed(2)}° <br>
        Middle-Ring: ${smoothAngles.a2.toFixed(2)}° <br>
        Ring-Pinky: ${smoothAngles.a3.toFixed(2)}°
      `;

      // Рисуем соединения
      drawConnections(landmarks);

      // Рисуем точки
      landmarks.forEach(p => {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      });
    }

    requestAnimationFrame(detect);
  }

  detect();
}

main();
