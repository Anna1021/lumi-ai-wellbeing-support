/* ============================
   CHART.JS GLOBAL SETTINGS
============================ */
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "#445";
Chart.defaults.elements.point.radius = 6;
Chart.defaults.elements.point.hoverRadius = 8;


/* ============================
   LINE CHART (Mood Trend)
============================ */

// 获取 2D context
const lineCtx = document.getElementById("moodChart").getContext("2d");

// 创建蓝色渐变（左 → 右）
const gradientLine = lineCtx.createLinearGradient(0, 0, 600, 0);
gradientLine.addColorStop(0, "rgba(76, 140, 255, 1)");
gradientLine.addColorStop(1, "rgba(140, 200, 255, 1)");

// 底部淡淡背景渐变
const gradientFill = lineCtx.createLinearGradient(0, 0, 0, 300);
gradientFill.addColorStop(0, "rgba(76, 140, 255, 0.25)");
gradientFill.addColorStop(1, "rgba(76, 140, 255, 0)");

new Chart(lineCtx, {
    type: "line",
    data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
            {
                label: "Mood Score",
                data: [3.2, 3.3, 3.8, 3.0, 2.8, 3.4, 3.7],
                borderColor: gradientLine,
                backgroundColor: gradientFill,
                borderWidth: 4,
                tension: 0.35,          // 平滑曲线
                fill: true,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#3C8BFF",
                pointBorderWidth: 3,
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                min: 0,
                max: 5,
                ticks: { stepSize: 1 },
                grid: { color: "rgba(0,0,0,0.05)" }
            },
            x: {
                grid: { display: false }
            }
        },
        plugins: {
            legend: { display: false }
        }
    }
});


/* ============================
   DONUT CHART (Mood Distribution)
============================ */

const donutCtx = document.getElementById("moodDonut").getContext("2d");

// Donut 渐变色 —— 参考你的高保真图
const positive = donutCtx.createLinearGradient(0, 0, 120, 120);
positive.addColorStop(0, "#3C8BFF");
positive.addColorStop(1, "#6AB3FF");

const neutral = donutCtx.createLinearGradient(0, 0, 120, 120);
neutral.addColorStop(0, "#AEC6FF");
neutral.addColorStop(1, "#CEDAFF");

const negative = donutCtx.createLinearGradient(0, 0, 120, 120);
negative.addColorStop(0, "#F2A3C7");
negative.addColorStop(1, "#F9C6D9");

new Chart(donutCtx, {
    type: "doughnut",
    data: {
        labels: ["Positive", "Neutral", "Negative"],
        datasets: [{
            data: [50, 30, 20],
            backgroundColor: [positive, neutral, negative],
            borderWidth: 3,
            borderColor: "#fff",
            hoverOffset: 10
        }]
    },
    options: {
        cutout: "60%",      // 中间空洞大小
        plugins: {
            legend: { display: false }
        }
    }
});
