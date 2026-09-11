document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".rating-button");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const submitButton = document.getElementById("submit-button");

  let answeredQuestions = 0;
  const totalQuestions = document.querySelectorAll(".questions-container .question").length;

  // 处理按钮点击事件
  buttons.forEach(button => {
    button.addEventListener("click", (e) => {
      const parent = e.target.closest(".rating"); // 获取当前问题的父容器
      const allButtons = parent.querySelectorAll(".rating-button");

      // 清除其他按钮的选中状态
      allButtons.forEach(btn => btn.classList.remove("selected"));

      // 设置当前按钮为选中状态
      e.target.classList.add("selected");

      // 更新回答状态
      if (!parent.classList.contains("answered")) {
        parent.classList.add("answered");
        answeredQuestions++;
      }

      // 更新进度条
      const progress = (answeredQuestions / totalQuestions) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${answeredQuestions}/${totalQuestions}`;
    });
  });

  // 提交按钮点击事件
  submitButton.addEventListener("click", () => {
    if (answeredQuestions < totalQuestions) {
      alert("Please answer all the questions before submitting!");
      return;
    }

    // 跳转到 Congratulations 页面
    window.location.href = "congratulations.html";
  });
});


// setting js
document.getElementById("text-size").addEventListener("change", (event) => {
  const size = event.target.value;
  document.body.style.fontSize = size === "small" ? "14px" : size === "large" ? "18px" : "16px";
});




/* 头像更新*/
// 打开模态框
function openModal() {
  document.getElementById('uploadModal').style.display = 'block';
}

// 关闭模态框
function closeModal() {
  document.getElementById('uploadModal').style.display = 'none';
}

// 上传图片逻辑
document.getElementById('avatarUploadForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const fileInput = document.getElementById('avatarInput');
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function(e) {
      // 将新头像设置为图片的 src
      document.querySelector('.avatar-image').src = e.target.result;
      // 关闭模态框
      closeModal();
      alert('Avatar updated successfully!');
    };

    reader.readAsDataURL(file); // 读取文件为 Base64 URL
  } else {
    alert('Please select a file!');
  }
});
