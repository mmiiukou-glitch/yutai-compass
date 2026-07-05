const startButton = document.getElementById("startButton");
const message = document.getElementById("message");

startButton.addEventListener("click", () => {
  message.textContent = "診断機能をここから作っていきます。";
});