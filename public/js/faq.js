document.addEventListener('DOMContentLoaded', function() {
    // Simpler FAQ toggle functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            // Close all other answers
            const allAnswers = document.querySelectorAll('.faq-answer');
            const allQuestions = document.querySelectorAll('.faq-question');
            
            allAnswers.forEach(answer => {
                if (answer !== this.nextElementSibling) {
                    answer.classList.remove('active');
                }
            });
            
            allQuestions.forEach(q => {
                if (q !== this) {
                    q.classList.remove('active');
                }
            });
            
            // Toggle current answer
            this.classList.toggle('active');
            this.nextElementSibling.classList.toggle('active');
        });
    });
});