export interface SSATQuestion {
  set_number: number;
  question_number: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  choice_e: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  domain: string;
}

export const ssatMathQuestions: SSATQuestion[] = [
  // ===== SET 1 =====
  // Number Operations
  { set_number: 1, question_number: 1, question_text: 'What is 12 × 15?', choice_a: '170', choice_b: '180', choice_c: '175', choice_d: '185', choice_e: '190', correct_answer: 'B', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 1, question_number: 2, question_text: 'Which of the following is closest to 48% of 250?', choice_a: '100', choice_b: '110', choice_c: '120', choice_d: '130', choice_e: '140', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 1, question_number: 3, question_text: 'If the product of two consecutive integers is 182, what is the larger integer?', choice_a: '12', choice_b: '13', choice_c: '14', choice_d: '15', choice_e: '16', correct_answer: 'C', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 1, question_number: 4, question_text: 'If 4x + 8 = 24, what is the value of x?', choice_a: '2', choice_b: '3', choice_c: '4', choice_d: '5', choice_e: '6', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 1, question_number: 5, question_text: 'The sequence 3, 7, 11, 15, ... follows a pattern. What is the 10th term?', choice_a: '35', choice_b: '37', choice_c: '39', choice_d: '41', choice_e: '43', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 1, question_number: 6, question_text: 'If f(x) = 2x² - 3x + 1, what is f(4)?', choice_a: '19', choice_b: '21', choice_c: '23', choice_d: '25', choice_e: '27', correct_answer: 'B', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 1, question_number: 7, question_text: 'A square has a perimeter of 36. What is its area?', choice_a: '72', choice_b: '81', choice_c: '64', choice_d: '49', choice_e: '100', correct_answer: 'B', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 1, question_number: 8, question_text: 'A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?', choice_a: '9', choice_b: '10', choice_c: '11', choice_d: '12', choice_e: '14', correct_answer: 'B', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 1, question_number: 9, question_text: 'A circle has a radius of 7. What is its area? (Use π ≈ 22/7)', choice_a: '144', choice_b: '154', choice_c: '164', choice_d: '174', choice_e: '184', correct_answer: 'B', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 1, question_number: 10, question_text: 'The ages of five students are 12, 14, 13, 15, and 11. What is the average (mean) age?', choice_a: '12', choice_b: '13', choice_c: '14', choice_d: '15', choice_e: '16', correct_answer: 'B', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 1, question_number: 11, question_text: 'In a bag with 4 red, 3 blue, and 5 green marbles, what is the probability of picking a blue marble?', choice_a: '1/4', choice_b: '1/3', choice_c: '1/5', choice_d: '1/6', choice_e: '3/12', correct_answer: 'A', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 1, question_number: 12, question_text: 'A data set has values 5, 8, 8, 9, 10, 12, 12, 12, 15. What is the mode?', choice_a: '8', choice_b: '9', choice_c: '10', choice_d: '12', choice_e: '15', correct_answer: 'D', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 1, question_number: 13, question_text: 'Maria has $50. She buys a book for $12 and a pen for $3. How much money does she have left?', choice_a: '$33', choice_b: '$34', choice_c: '$35', choice_d: '$36', choice_e: '$37', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 1, question_number: 14, question_text: 'A train travels 240 miles in 4 hours. At the same rate, how many miles will it travel in 7 hours?', choice_a: '380', choice_b: '400', choice_c: '420', choice_d: '440', choice_e: '460', correct_answer: 'C', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 1, question_number: 15, question_text: 'Two pipes fill a tank. Pipe A fills it in 6 hours, Pipe B in 4 hours. How many hours does it take both pipes working together?', choice_a: '1.8', choice_b: '2.0', choice_c: '2.4', choice_d: '2.6', choice_e: '3.0', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 2 =====
  // Number Operations
  { set_number: 2, question_number: 1, question_text: 'What is the greatest common factor of 36 and 48?', choice_a: '6', choice_b: '8', choice_c: '10', choice_d: '12', choice_e: '18', correct_answer: 'D', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 2, question_number: 2, question_text: 'What is 3/8 expressed as a decimal?', choice_a: '0.275', choice_b: '0.325', choice_c: '0.375', choice_d: '0.425', choice_e: '0.475', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 2, question_number: 3, question_text: 'What is the least common multiple of 8, 12, and 18?', choice_a: '36', choice_b: '48', choice_c: '60', choice_d: '72', choice_e: '84', correct_answer: 'D', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 2, question_number: 4, question_text: 'If 3y - 6 = 15, what is the value of y?', choice_a: '5', choice_b: '6', choice_c: '7', choice_d: '8', choice_e: '9', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 2, question_number: 5, question_text: 'The pattern is: 2, 6, 18, 54, ... What is the next term?', choice_a: '108', choice_b: '126', choice_c: '144', choice_d: '162', choice_e: '180', correct_answer: 'D', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 2, question_number: 6, question_text: 'If 2x + 3y = 12 and x = 3, what is the value of y?', choice_a: '1', choice_b: '2', choice_c: '3', choice_d: '4', choice_e: '5', correct_answer: 'B', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 2, question_number: 7, question_text: 'A rectangle has a length of 10 and a width of 6. What is its perimeter?', choice_a: '28', choice_b: '30', choice_c: '32', choice_d: '34', choice_e: '36', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 2, question_number: 8, question_text: 'An equilateral triangle has a side length of 9. What is its perimeter?', choice_a: '18', choice_b: '24', choice_c: '27', choice_d: '30', choice_e: '36', correct_answer: 'C', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 2, question_number: 9, question_text: 'A trapezoid has parallel sides of 8 and 14, and a height of 5. What is its area?', choice_a: '50', choice_b: '55', choice_c: '60', choice_d: '65', choice_e: '70', correct_answer: 'B', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 2, question_number: 10, question_text: 'The test scores are 70, 80, 90, 85, and 75. What is the median score?', choice_a: '75', choice_b: '80', choice_c: '82', choice_d: '85', choice_e: '90', correct_answer: 'B', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 2, question_number: 11, question_text: 'A spinner has 8 equal sections numbered 1 to 8. What is the probability of landing on a prime number?', choice_a: '1/4', choice_b: '3/8', choice_c: '1/2', choice_d: '5/8', choice_e: '3/4', correct_answer: 'C', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 2, question_number: 12, question_text: 'The range of a data set is 28. If the smallest value is 14, what is the largest value?', choice_a: '38', choice_b: '40', choice_c: '42', choice_d: '44', choice_e: '46', correct_answer: 'C', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 2, question_number: 13, question_text: 'A store sells apples for $0.50 each. How much do 16 apples cost?', choice_a: '$7.00', choice_b: '$7.50', choice_c: '$8.00', choice_d: '$8.50', choice_e: '$9.00', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 2, question_number: 14, question_text: 'A car uses 6 gallons of gas to travel 180 miles. At this rate, how many gallons are needed to travel 270 miles?', choice_a: '7', choice_b: '8', choice_c: '9', choice_d: '10', choice_e: '11', correct_answer: 'C', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 2, question_number: 15, question_text: 'Alice is 3 times as old as Bob. In 6 years, Alice will be twice as old as Bob. How old is Bob now?', choice_a: '4', choice_b: '5', choice_c: '6', choice_d: '7', choice_e: '8', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 3 =====
  // Number Operations
  { set_number: 3, question_number: 1, question_text: 'What is 25% of 160?', choice_a: '30', choice_b: '35', choice_c: '40', choice_d: '45', choice_e: '50', correct_answer: 'C', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 3, question_number: 2, question_text: 'Which fraction is equivalent to 0.6?', choice_a: '2/5', choice_b: '3/5', choice_c: '2/3', choice_d: '4/5', choice_e: '5/6', correct_answer: 'B', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 3, question_number: 3, question_text: 'If n is a positive integer and 2n + 1 is divisible by 5, which could be a value of n?', choice_a: '4', choice_b: '5', choice_c: '6', choice_d: '7', choice_e: '8', correct_answer: 'D', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 3, question_number: 4, question_text: 'If 5a = 45, what is the value of a + 3?', choice_a: '10', choice_b: '11', choice_c: '12', choice_d: '13', choice_e: '14', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 3, question_number: 5, question_text: 'Which equation represents a line passing through (0, 3) with slope 2?', choice_a: 'y = 3x + 2', choice_b: 'y = 2x - 3', choice_c: 'y = 2x + 3', choice_d: 'y = 3x - 2', choice_e: 'y = x + 3', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 3, question_number: 6, question_text: 'The sum of three consecutive even integers is 78. What is the largest of the three?', choice_a: '24', choice_b: '26', choice_c: '28', choice_d: '30', choice_e: '32', correct_answer: 'C', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 3, question_number: 7, question_text: 'Two angles of a triangle measure 45° and 75°. What is the measure of the third angle?', choice_a: '50°', choice_b: '55°', choice_c: '60°', choice_d: '65°', choice_e: '70°', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 3, question_number: 8, question_text: 'A circle has a circumference of 31.4. What is its radius? (Use π ≈ 3.14)', choice_a: '4', choice_b: '5', choice_c: '6', choice_d: '7', choice_e: '8', correct_answer: 'B', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 3, question_number: 9, question_text: 'A rectangular box has dimensions 4 × 5 × 6. What is its volume?', choice_a: '100', choice_b: '110', choice_c: '120', choice_d: '130', choice_e: '140', correct_answer: 'C', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 3, question_number: 10, question_text: 'In a class of 25 students, 15 passed the exam. What percentage passed?', choice_a: '50%', choice_b: '55%', choice_c: '60%', choice_d: '65%', choice_e: '70%', correct_answer: 'C', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 3, question_number: 11, question_text: 'From a deck of 52 cards, one card is drawn. What is the probability it is a heart?', choice_a: '1/13', choice_b: '1/4', choice_c: '1/2', choice_d: '4/13', choice_e: '3/4', correct_answer: 'B', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 3, question_number: 12, question_text: 'The mean of six numbers is 14. Five of the numbers are 10, 12, 15, 16, and 17. What is the sixth number?', choice_a: '12', choice_b: '13', choice_c: '14', choice_d: '15', choice_e: '16', correct_answer: 'C', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 3, question_number: 13, question_text: 'A shirt originally costs $40 and is on sale for 25% off. What is the sale price?', choice_a: '$28', choice_b: '$30', choice_c: '$32', choice_d: '$34', choice_e: '$36', correct_answer: 'B', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 3, question_number: 14, question_text: 'Tom can paint a fence in 3 hours and Jerry can paint the same fence in 6 hours. How long does it take them working together?', choice_a: '1.5 hours', choice_b: '2 hours', choice_c: '2.5 hours', choice_d: '3 hours', choice_e: '4 hours', correct_answer: 'B', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 3, question_number: 15, question_text: 'A mixture of 60 liters is 40% acid. How many liters of pure acid must be added to make the mixture 50% acid?', choice_a: '8', choice_b: '10', choice_c: '12', choice_d: '14', choice_e: '16', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 4 =====
  // Number Operations
  { set_number: 4, question_number: 1, question_text: 'What is 7³?', choice_a: '343', choice_b: '363', choice_c: '373', choice_d: '383', choice_e: '393', correct_answer: 'A', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 4, question_number: 2, question_text: 'Which of the following is a perfect square? ', choice_a: '50', choice_b: '72', choice_c: '98', choice_d: '144', choice_e: '200', correct_answer: 'D', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 4, question_number: 3, question_text: 'If x = -3, what is the value of x² - 2x + 4?', choice_a: '17', choice_b: '19', choice_c: '21', choice_d: '23', choice_e: '25', correct_answer: 'B', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 4, question_number: 4, question_text: 'If n + 15 = 30, what is 2n?', choice_a: '25', choice_b: '28', choice_c: '30', choice_d: '32', choice_e: '35', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 4, question_number: 5, question_text: 'The nth term of a sequence is 3n - 1. What is the sum of the 5th and 6th terms?', choice_a: '25', choice_b: '26', choice_c: '27', choice_d: '28', choice_e: '29', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 4, question_number: 6, question_text: 'If x + y = 10 and x - y = 4, what is the value of xy?', choice_a: '20', choice_b: '21', choice_c: '22', choice_d: '23', choice_e: '24', correct_answer: 'B', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 4, question_number: 7, question_text: 'What is the area of a triangle with base 10 and height 8?', choice_a: '30', choice_b: '35', choice_c: '40', choice_d: '45', choice_e: '50', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 4, question_number: 8, question_text: 'A cube has a volume of 125 cubic centimeters. What is the length of one side?', choice_a: '3', choice_b: '4', choice_c: '5', choice_d: '6', choice_e: '7', correct_answer: 'C', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 4, question_number: 9, question_text: 'Two similar triangles have sides in the ratio 3:5. If the area of the smaller triangle is 27 cm², what is the area of the larger triangle?', choice_a: '45', choice_b: '60', choice_c: '75', choice_d: '80', choice_e: '90', correct_answer: 'C', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 4, question_number: 10, question_text: 'What is the median of the set {3, 7, 9, 11, 13}?', choice_a: '7', choice_b: '8', choice_c: '9', choice_d: '10', choice_e: '11', correct_answer: 'C', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 4, question_number: 11, question_text: 'Two coins are tossed. What is the probability of getting exactly one head?', choice_a: '1/4', choice_b: '1/3', choice_c: '1/2', choice_d: '2/3', choice_e: '3/4', correct_answer: 'C', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 4, question_number: 12, question_text: 'A store tracks sales: Mon 45, Tue 52, Wed 48, Thu 60, Fri 55. What is the mean daily sale?', choice_a: '50', choice_b: '52', choice_c: '54', choice_d: '56', choice_e: '58', correct_answer: 'B', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 4, question_number: 13, question_text: 'If 5 pens cost $7.50, how much do 8 pens cost?', choice_a: '$10.00', choice_b: '$11.50', choice_c: '$12.00', choice_d: '$12.50', choice_e: '$13.00', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 4, question_number: 14, question_text: 'A boat travels downstream at 18 mph and upstream at 12 mph. What is the speed of the current?', choice_a: '2', choice_b: '3', choice_c: '4', choice_d: '5', choice_e: '6', correct_answer: 'B', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 4, question_number: 15, question_text: 'An investment of $1000 earns 10% simple interest per year. After how many years will the total be $1400?', choice_a: '2', choice_b: '3', choice_c: '4', choice_d: '5', choice_e: '6', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 5 =====
  // Number Operations
  { set_number: 5, question_number: 1, question_text: 'What is the value of √144?', choice_a: '10', choice_b: '11', choice_c: '12', choice_d: '13', choice_e: '14', correct_answer: 'C', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 5, question_number: 2, question_text: 'If 20% of a number is 16, what is 75% of that number?', choice_a: '50', choice_b: '55', choice_c: '60', choice_d: '65', choice_e: '70', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 5, question_number: 3, question_text: 'What is the prime factorization of 360?', choice_a: '2³ × 3² × 5', choice_b: '2² × 3² × 5²', choice_c: '2³ × 3 × 5²', choice_d: '2⁴ × 3 × 5', choice_e: '2² × 3³ × 5', correct_answer: 'A', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 5, question_number: 4, question_text: 'If p = 4, what is 3p² - 2p + 5?', choice_a: '41', choice_b: '43', choice_c: '45', choice_d: '47', choice_e: '49', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 5, question_number: 5, question_text: 'What value of x satisfies: 2(x + 3) = 5x - 9?', choice_a: '3', choice_b: '4', choice_c: '5', choice_d: '6', choice_e: '7', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 5, question_number: 6, question_text: 'If a function is defined by g(x) = (x + 2)(x - 4), for what values of x does g(x) = 0?', choice_a: 'x = -2 and x = 4', choice_b: 'x = 2 and x = -4', choice_c: 'x = -2 and x = -4', choice_d: 'x = 2 and x = 4', choice_e: 'x = -4 and x = 0', correct_answer: 'A', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 5, question_number: 7, question_text: 'A parallelogram has a base of 12 and height of 5. What is its area?', choice_a: '50', choice_b: '55', choice_c: '60', choice_d: '65', choice_e: '70', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 5, question_number: 8, question_text: 'The sum of interior angles of a polygon is 720°. How many sides does the polygon have?', choice_a: '5', choice_b: '6', choice_c: '7', choice_d: '8', choice_e: '9', correct_answer: 'B', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 5, question_number: 9, question_text: 'A cone has radius 3 and height 4. What is its volume? (V = πr²h/3, use π ≈ 3.14)', choice_a: '36.68', choice_b: '37.68', choice_c: '38.68', choice_d: '39.68', choice_e: '40.68', correct_answer: 'B', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 5, question_number: 10, question_text: 'What is the range of the data: 4, 9, 3, 7, 11, 5?', choice_a: '6', choice_b: '7', choice_c: '8', choice_d: '9', choice_e: '10', correct_answer: 'C', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 5, question_number: 11, question_text: 'A box contains 3 red, 4 white, and 5 blue balls. If one is drawn at random, what is the probability it is NOT red?', choice_a: '1/4', choice_b: '1/3', choice_c: '2/3', choice_d: '3/4', choice_e: '5/6', correct_answer: 'D', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 5, question_number: 12, question_text: 'The mean of 7 numbers is 11. If one number (13) is removed, what is the mean of the remaining 6 numbers?', choice_a: '10.0', choice_b: '10.5', choice_c: '11.0', choice_d: '11.5', choice_e: '12.0', correct_answer: 'B', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 5, question_number: 13, question_text: 'If John walks 4 miles per hour, how long does it take him to walk 10 miles?', choice_a: '2 hours', choice_b: '2.5 hours', choice_c: '3 hours', choice_d: '3.5 hours', choice_e: '4 hours', correct_answer: 'B', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 5, question_number: 14, question_text: 'A store buys an item for $60 and sells it at a 40% profit. What is the selling price?', choice_a: '$80', choice_b: '$82', choice_c: '$84', choice_d: '$86', choice_e: '$88', correct_answer: 'C', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 5, question_number: 15, question_text: 'There are 40 students. The ratio of boys to girls is 3:5. How many more girls are there than boys?', choice_a: '8', choice_b: '10', choice_c: '12', choice_d: '14', choice_e: '16', correct_answer: 'B', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 6 =====
  // Number Operations
  { set_number: 6, question_number: 1, question_text: 'What is 16 + 28 ÷ 4 - 3?', choice_a: '18', choice_b: '19', choice_c: '20', choice_d: '21', choice_e: '22', correct_answer: 'C', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 6, question_number: 2, question_text: 'Which is greater: 5/6 or 7/8?', choice_a: '5/6', choice_b: '7/8', choice_c: 'They are equal', choice_d: 'Cannot be determined', choice_e: 'Neither', correct_answer: 'B', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 6, question_number: 3, question_text: 'How many positive integers less than 100 are divisible by both 3 and 4?', choice_a: '6', choice_b: '7', choice_c: '8', choice_d: '9', choice_e: '10', correct_answer: 'C', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 6, question_number: 4, question_text: 'If x/4 = 9, what is x - 8?', choice_a: '26', choice_b: '28', choice_c: '30', choice_d: '32', choice_e: '34', correct_answer: 'B', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 6, question_number: 5, question_text: 'The sequence 1, 4, 9, 16, 25, ... What is the 8th term?', choice_a: '56', choice_b: '60', choice_c: '64', choice_d: '68', choice_e: '72', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 6, question_number: 6, question_text: 'If 3x² = 75, what are the values of x?', choice_a: '±3', choice_b: '±4', choice_c: '±5', choice_d: '±6', choice_e: '±7', correct_answer: 'C', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 6, question_number: 7, question_text: 'What is the area of a circle with diameter 10? (Use π ≈ 3.14)', choice_a: '78.5', choice_b: '80.5', choice_c: '82.5', choice_d: '84.5', choice_e: '86.5', correct_answer: 'A', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 6, question_number: 8, question_text: 'A right triangle has one angle of 30° and the hypotenuse is 20. What is the length of the shorter leg?', choice_a: '8', choice_b: '9', choice_c: '10', choice_d: '11', choice_e: '12', correct_answer: 'C', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 6, question_number: 9, question_text: 'Two parallel lines are cut by a transversal. One interior angle is 65°. What is the measure of the co-interior angle?', choice_a: '105°', choice_b: '110°', choice_c: '115°', choice_d: '120°', choice_e: '125°', correct_answer: 'C', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 6, question_number: 10, question_text: 'What is the mode of: 5, 3, 8, 3, 7, 5, 3, 6?', choice_a: '3', choice_b: '5', choice_c: '6', choice_d: '7', choice_e: '8', correct_answer: 'A', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 6, question_number: 11, question_text: 'A fair six-sided die is rolled twice. What is the probability of rolling a 6 both times?', choice_a: '1/12', choice_b: '1/18', choice_c: '1/24', choice_d: '1/30', choice_e: '1/36', correct_answer: 'E', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 6, question_number: 12, question_text: 'The mean score of 10 students is 82. After one more student scores 92, what is the new mean?', choice_a: '82.9', choice_b: '83', choice_c: '83.1', choice_d: '83.5', choice_e: '84', correct_answer: 'B', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 6, question_number: 13, question_text: 'A recipe needs 2.5 cups of flour for 20 cookies. How many cups are needed for 48 cookies?', choice_a: '5', choice_b: '5.5', choice_c: '6', choice_d: '6.5', choice_e: '7', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 6, question_number: 14, question_text: 'A pool contains 2400 gallons. A drain empties it at 120 gallons per hour, while a pump fills it at 80 gallons per hour. How long does it take to empty the pool?', choice_a: '40 hours', choice_b: '50 hours', choice_c: '60 hours', choice_d: '70 hours', choice_e: '80 hours', correct_answer: 'C', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 6, question_number: 15, question_text: 'A man is 4 times as old as his son. 20 years later, he will be twice as old as his son. How old is the son now?', choice_a: '8', choice_b: '9', choice_c: '10', choice_d: '11', choice_e: '12', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 7 =====
  // Number Operations
  { set_number: 7, question_number: 1, question_text: 'What is 2/3 + 3/4?', choice_a: '5/7', choice_b: '17/12', choice_c: '5/12', choice_d: '13/12', choice_e: '7/12', correct_answer: 'B', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 7, question_number: 2, question_text: 'A number increased by 35% becomes 81. What is the original number?', choice_a: '55', choice_b: '58', choice_c: '60', choice_d: '62', choice_e: '65', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 7, question_number: 3, question_text: 'What is the value of 4! + 3! - 2!?', choice_a: '26', choice_b: '28', choice_c: '30', choice_d: '32', choice_e: '34', correct_answer: 'B', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 7, question_number: 4, question_text: 'If t = 6, what is 4t - 7?', choice_a: '15', choice_b: '16', choice_c: '17', choice_d: '18', choice_e: '19', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 7, question_number: 5, question_text: 'The sequence 2, 5, 10, 17, 26, ... What is the next term?', choice_a: '35', choice_b: '37', choice_c: '39', choice_d: '41', choice_e: '43', correct_answer: 'B', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 7, question_number: 6, question_text: 'If m and n are positive integers with m > n, and m² - n² = 40, which pair could be (m, n)?', choice_a: '(6, 2)', choice_b: '(7, 3)', choice_c: '(8, 2)', choice_d: '(9, 1)', choice_e: '(10, 0)', correct_answer: 'A', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 7, question_number: 7, question_text: 'What is the area of a rhombus with diagonals of length 8 and 10?', choice_a: '36', choice_b: '38', choice_c: '40', choice_d: '42', choice_e: '44', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 7, question_number: 8, question_text: 'A cylinder has radius 4 and height 9. What is its volume? (Use π ≈ 3.14)', choice_a: '428.52', choice_b: '452.16', choice_c: '476.0', choice_d: '489.84', choice_e: '502.4', correct_answer: 'B', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 7, question_number: 9, question_text: 'In a right triangle, the hypotenuse is 26 and one leg is 10. What is the area of the triangle?', choice_a: '100', choice_b: '110', choice_c: '120', choice_d: '130', choice_e: '140', correct_answer: 'C', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 7, question_number: 10, question_text: 'What is the mean of 12, 18, 24, 30?', choice_a: '20', choice_b: '21', choice_c: '22', choice_d: '23', choice_e: '24', correct_answer: 'B', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 7, question_number: 11, question_text: 'From a group of 5 boys and 4 girls, one person is chosen randomly. What is the probability the person is a girl?', choice_a: '4/9', choice_b: '5/9', choice_c: '4/5', choice_d: '1/3', choice_e: '1/2', correct_answer: 'A', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 7, question_number: 12, question_text: 'If the interquartile range of a dataset is 15 and Q1 = 20, what is Q3?', choice_a: '30', choice_b: '32', choice_c: '33', choice_d: '35', choice_e: '37', correct_answer: 'D', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 7, question_number: 13, question_text: 'If 3 notebooks cost $4.50, how much do 10 notebooks cost?', choice_a: '$13.00', choice_b: '$14.00', choice_c: '$15.00', choice_d: '$16.00', choice_e: '$17.00', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 7, question_number: 14, question_text: 'A worker earns $15 per hour and works 8 hours. He receives a 20% bonus. What is his total pay?', choice_a: '$140', choice_b: '$144', choice_c: '$148', choice_d: '$152', choice_e: '$156', correct_answer: 'B', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 7, question_number: 15, question_text: 'Two cars start from the same point. Car A travels north at 60 mph and car B travels east at 80 mph. How far apart are they after 2 hours?', choice_a: '180 miles', choice_b: '200 miles', choice_c: '220 miles', choice_d: '240 miles', choice_e: '260 miles', correct_answer: 'B', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 8 =====
  // Number Operations
  { set_number: 8, question_number: 1, question_text: 'What is the value of 2⁵ × 2³?', choice_a: '128', choice_b: '192', choice_c: '256', choice_d: '320', choice_e: '512', correct_answer: 'C', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 8, question_number: 2, question_text: 'What is 3/5 of 120?', choice_a: '60', choice_b: '66', choice_c: '72', choice_d: '78', choice_e: '84', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 8, question_number: 3, question_text: 'If p and q are prime numbers and p × q = 77, what is p + q?', choice_a: '16', choice_b: '17', choice_c: '18', choice_d: '19', choice_e: '20', correct_answer: 'C', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 8, question_number: 4, question_text: 'If 8 - 2x = 4, what is x?', choice_a: '1', choice_b: '2', choice_c: '3', choice_d: '4', choice_e: '5', correct_answer: 'B', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 8, question_number: 5, question_text: 'Which expression is equivalent to (x + 3)²?', choice_a: 'x² + 6', choice_b: 'x² + 9', choice_c: 'x² + 6x + 9', choice_d: 'x² + 3x + 9', choice_e: 'x² + 6x + 6', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 8, question_number: 6, question_text: 'If log₂(x) = 5, what is x?', choice_a: '10', choice_b: '16', choice_c: '25', choice_d: '32', choice_e: '64', correct_answer: 'D', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 8, question_number: 7, question_text: 'An angle measures 130°. What is the measure of its supplement?', choice_a: '40°', choice_b: '45°', choice_c: '50°', choice_d: '55°', choice_e: '60°', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 8, question_number: 8, question_text: 'A regular hexagon has a side length of 6. What is its perimeter?', choice_a: '30', choice_b: '32', choice_c: '34', choice_d: '36', choice_e: '38', correct_answer: 'D', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 8, question_number: 9, question_text: 'A square is inscribed in a circle of radius 5. What is the area of the square?', choice_a: '40', choice_b: '45', choice_c: '50', choice_d: '55', choice_e: '60', correct_answer: 'C', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 8, question_number: 10, question_text: 'In a survey, 60 out of 150 students prefer math. What percentage prefer math?', choice_a: '35%', choice_b: '38%', choice_c: '40%', choice_d: '42%', choice_e: '45%', correct_answer: 'C', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 8, question_number: 11, question_text: 'Three fair coins are tossed. What is the probability of getting at least two heads?', choice_a: '3/8', choice_b: '4/8', choice_c: '5/8', choice_d: '6/8', choice_e: '7/8', correct_answer: 'B', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 8, question_number: 12, question_text: 'The standard deviation is highest for which data set?', choice_a: '{5, 5, 5, 5, 5}', choice_b: '{4, 5, 5, 5, 6}', choice_c: '{3, 4, 5, 6, 7}', choice_d: '{2, 4, 5, 6, 8}', choice_e: '{1, 3, 5, 7, 9}', correct_answer: 'E', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 8, question_number: 13, question_text: 'A bike is on sale at 30% off. If the original price was $200, what is the sale price?', choice_a: '$120', choice_b: '$130', choice_c: '$140', choice_d: '$150', choice_e: '$160', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 8, question_number: 14, question_text: 'A map uses a scale of 1 inch = 25 miles. If two cities are 3.5 inches apart on the map, what is the actual distance?', choice_a: '75 miles', choice_b: '82.5 miles', choice_c: '87.5 miles', choice_d: '90 miles', choice_e: '92.5 miles', correct_answer: 'C', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 8, question_number: 15, question_text: 'Compound interest: $2000 invested at 5% per year. What is the total after 2 years?', choice_a: '$2200', choice_b: '$2202.50', choice_c: '$2205', choice_d: '$2207.50', choice_e: '$2210', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 9 =====
  // Number Operations
  { set_number: 9, question_number: 1, question_text: 'What is 5! (5 factorial)?', choice_a: '100', choice_b: '110', choice_c: '120', choice_d: '130', choice_e: '140', correct_answer: 'C', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 9, question_number: 2, question_text: 'Which of the following is between 3/7 and 5/9?', choice_a: '7/18', choice_b: '8/18', choice_c: '9/18', choice_d: '10/18', choice_e: '11/18', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 9, question_number: 3, question_text: 'The sum of the digits of a two-digit number is 11. If the digits are reversed, the number increases by 27. What is the original number?', choice_a: '38', choice_b: '47', choice_c: '56', choice_d: '65', choice_e: '74', correct_answer: 'B', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 9, question_number: 4, question_text: 'If 7 less than twice a number is 15, what is the number?', choice_a: '9', choice_b: '10', choice_c: '11', choice_d: '12', choice_e: '13', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 9, question_number: 5, question_text: 'If y varies directly with x, and y = 14 when x = 4, what is y when x = 10?', choice_a: '30', choice_b: '32', choice_c: '33', choice_d: '35', choice_e: '36', correct_answer: 'D', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 9, question_number: 6, question_text: 'The quadratic x² - 5x + 6 = 0 has solutions x = ?', choice_a: 'x = 1 and x = 6', choice_b: 'x = 2 and x = 3', choice_c: 'x = -2 and x = -3', choice_d: 'x = 1 and x = -6', choice_e: 'x = -1 and x = 6', correct_answer: 'B', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 9, question_number: 7, question_text: 'The perimeter of a regular pentagon is 45. What is the length of one side?', choice_a: '7', choice_b: '8', choice_c: '9', choice_d: '10', choice_e: '11', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 9, question_number: 8, question_text: 'A sector of a circle has a central angle of 90° and radius 12. What is the arc length? (Use π ≈ 3.14)', choice_a: '18.84', choice_b: '19.84', choice_c: '20.84', choice_d: '21.84', choice_e: '22.84', correct_answer: 'A', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 9, question_number: 9, question_text: 'A sphere has a radius of 3. What is its surface area? (SA = 4πr², use π ≈ 3.14)', choice_a: '100.48', choice_b: '108.64', choice_c: '113.04', choice_d: '120.16', choice_e: '125.60', correct_answer: 'C', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 9, question_number: 10, question_text: 'What is the median of: 2, 4, 6, 8, 10, 12?', choice_a: '6', choice_b: '7', choice_c: '8', choice_d: '9', choice_e: '10', correct_answer: 'B', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 9, question_number: 11, question_text: 'A bag has 6 red and 4 blue balls. Two balls are drawn without replacement. What is the probability both are red?', choice_a: '1/3', choice_b: '2/5', choice_c: '1/4', choice_d: '1/5', choice_e: '1/6', correct_answer: 'A', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 9, question_number: 12, question_text: 'If the average of 5 numbers is 20, and the average of 3 of them is 15, what is the average of the other 2?', choice_a: '25', choice_b: '26', choice_c: '27', choice_d: '28', choice_e: '29', correct_answer: 'C', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 9, question_number: 13, question_text: 'Sarah runs 5 km in 25 minutes. At this pace, how long does it take to run 15 km?', choice_a: '65 min', choice_b: '70 min', choice_c: '75 min', choice_d: '80 min', choice_e: '85 min', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 9, question_number: 14, question_text: 'A rectangle\'s length is 3 more than twice its width. The perimeter is 66. What is the width?', choice_a: '8', choice_b: '9', choice_c: '10', choice_d: '11', choice_e: '12', correct_answer: 'C', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 9, question_number: 15, question_text: 'A merchant sells goods at a 25% markup over cost. If a customer pays $75, what was the merchant\'s cost?', choice_a: '$54', choice_b: '$56', choice_c: '$58', choice_d: '$60', choice_e: '$62', correct_answer: 'D', difficulty: 'Hard', domain: 'Word Problems' },

  // ===== SET 10 =====
  // Number Operations
  { set_number: 10, question_number: 1, question_text: 'What is 40% of 150?', choice_a: '50', choice_b: '55', choice_c: '60', choice_d: '65', choice_e: '70', correct_answer: 'C', difficulty: 'Easy', domain: 'Number Operations' },
  { set_number: 10, question_number: 2, question_text: 'If x is an integer and 40 < x² < 80, how many possible values does x have?', choice_a: '4', choice_b: '6', choice_c: '8', choice_d: '10', choice_e: '12', correct_answer: 'C', difficulty: 'Medium', domain: 'Number Operations' },
  { set_number: 10, question_number: 3, question_text: 'What is the remainder when 2³⁰ is divided by 7?', choice_a: '1', choice_b: '2', choice_c: '3', choice_d: '4', choice_e: '5', correct_answer: 'A', difficulty: 'Hard', domain: 'Number Operations' },
  // Algebra/Patterns
  { set_number: 10, question_number: 4, question_text: 'Solve: 5(x - 2) = 20', choice_a: '4', choice_b: '5', choice_c: '6', choice_d: '7', choice_e: '8', correct_answer: 'C', difficulty: 'Easy', domain: 'Algebra/Patterns' },
  { set_number: 10, question_number: 5, question_text: 'A function f(x) = 2x + 1. What is f(f(3))?', choice_a: '13', choice_b: '14', choice_c: '15', choice_d: '16', choice_e: '17', correct_answer: 'C', difficulty: 'Medium', domain: 'Algebra/Patterns' },
  { set_number: 10, question_number: 6, question_text: 'The sum of an arithmetic sequence of 10 terms is 250. If the first term is 7, what is the common difference?', choice_a: '3', choice_b: '4', choice_c: '5', choice_d: '6', choice_e: '7', correct_answer: 'B', difficulty: 'Hard', domain: 'Algebra/Patterns' },
  // Geometry
  { set_number: 10, question_number: 7, question_text: 'A right angle is bisected. What is the measure of each resulting angle?', choice_a: '30°', choice_b: '40°', choice_c: '45°', choice_d: '50°', choice_e: '60°', correct_answer: 'C', difficulty: 'Easy', domain: 'Geometry' },
  { set_number: 10, question_number: 8, question_text: 'The ratio of the sides of two similar rectangles is 2:3. If the area of the smaller is 24 cm², what is the area of the larger?', choice_a: '48', choice_b: '50', choice_c: '52', choice_d: '54', choice_e: '56', correct_answer: 'D', difficulty: 'Medium', domain: 'Geometry' },
  { set_number: 10, question_number: 9, question_text: 'A regular octagon has a perimeter of 48. What is the area if the apothem is 7.24?', choice_a: '170', choice_b: '173.76', choice_c: '176', choice_d: '179.5', choice_e: '182', correct_answer: 'B', difficulty: 'Hard', domain: 'Geometry' },
  // Data/Statistics
  { set_number: 10, question_number: 10, question_text: 'What is the mean of 5, 10, 15, 20, 25?', choice_a: '13', choice_b: '14', choice_c: '15', choice_d: '16', choice_e: '17', correct_answer: 'C', difficulty: 'Easy', domain: 'Data/Statistics' },
  { set_number: 10, question_number: 11, question_text: 'In how many ways can 4 books be arranged on a shelf?', choice_a: '16', choice_b: '20', choice_c: '24', choice_d: '28', choice_e: '32', correct_answer: 'C', difficulty: 'Medium', domain: 'Data/Statistics' },
  { set_number: 10, question_number: 12, question_text: 'A committee of 3 is chosen from 8 people. How many different committees are possible?', choice_a: '48', choice_b: '52', choice_c: '56', choice_d: '60', choice_e: '64', correct_answer: 'C', difficulty: 'Hard', domain: 'Data/Statistics' },
  // Word Problems
  { set_number: 10, question_number: 13, question_text: 'A jar has 15 red and 10 blue candies. What fraction of the candies are red?', choice_a: '2/5', choice_b: '1/2', choice_c: '3/5', choice_d: '2/3', choice_e: '3/4', correct_answer: 'C', difficulty: 'Easy', domain: 'Word Problems' },
  { set_number: 10, question_number: 14, question_text: 'Machine A produces 400 parts per day. Machine B produces 600 parts per day. Together, how many days to produce 5000 parts?', choice_a: '4', choice_b: '5', choice_c: '6', choice_d: '7', choice_e: '8', correct_answer: 'B', difficulty: 'Medium', domain: 'Word Problems' },
  { set_number: 10, question_number: 15, question_text: 'An alloy is 30% copper. If 20 kg of another alloy (50% copper) is added to 30 kg of the first, what percentage of the mixture is copper?', choice_a: '36%', choice_b: '37%', choice_c: '38%', choice_d: '39%', choice_e: '40%', correct_answer: 'C', difficulty: 'Hard', domain: 'Word Problems' },
];
