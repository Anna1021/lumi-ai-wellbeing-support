// JavaScript for "Quote of the Day" feature with page beautification

// Array of quotes
const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Success is not the key to happiness. Happiness is the key to success. - Albert Schweitzer",
  "It does not matter how slowly you go as long as you do not stop. - Confucius",
  "In the middle of every difficulty lies opportunity. - Albert Einstein",
  "Do what you can, with what you have, where you are. - Theodore Roosevelt"
];

// Function to display a random quote
function displayQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quoteDisplay = document.getElementById('quote-display');
  quoteDisplay.textContent = quotes[randomIndex];

  // Add animation to the quote display
  quoteDisplay.style.opacity = 0;
  setTimeout(() => {
    quoteDisplay.style.opacity = 1;
  }, 100);
}

// Function to enhance page styling
function beautifyPage() {
  document.body.style.transition = 'background-color 0.5s ease';
  document.body.style.backgroundColor = '#f0f8ff';

  const header = document.querySelector('.header');
  header.style.transition = 'box-shadow 0.5s ease';
  header.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';

  const button = document.getElementById('quote-button');
  button.style.transition = 'transform 0.3s ease';
  button.addEventListener('mouseover', () => {
    button.style.transform = 'scale(1.1)';
  });
  button.addEventListener('mouseout', () => {
    button.style.transform = 'scale(1)';
  });

  const footer = document.querySelector('.footer');
  footer.style.transition = 'background-color 0.5s ease';
  footer.style.backgroundColor = '#ffc0cb';
}

// Add event listeners on page load
window.onload = function () {
  const quoteButton = document.getElementById('quote-button');
  quoteButton.addEventListener('click', displayQuote);

  // Apply beautification
  beautifyPage();
};
