// Demo data for UCSC CMPS 5J - Introduction to Programming in Java
// Based on UC Santa Cruz Baskin School of Engineering course structure
// Quarter system (10 weeks)

export const DEMO_COURSE_INFO = {
  name: "CMPS 5J - Introduction to Programming in Java",
  university: "University of California, Santa Cruz",
  department: "Baskin School of Engineering",
  term: "Fall 2024",
  professor: "Demo Professor",
  joinCode: "UCSC01",
}

// Demo syllabus chunks - mix of policy and concept content
export const DEMO_SYLLABUS_CHUNKS = [
  // Page 1 - Course Overview
  {
    content: "CMPS 5J - Introduction to Programming in Java\n\nCourse Description: This course introduces fundamental programming concepts using Java. Topics include variables, control flow, methods, object-oriented programming basics, and data structures. No prior programming experience required. This course is designed for students who are new to programming and want to learn Java from the ground up.",
    pageNumber: 1,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Learning Objectives: By the end of this course, students will be able to write Java programs using variables, control structures, methods, and classes. Students will understand object-oriented programming concepts including inheritance and polymorphism. Students will be able to read and write files, handle exceptions, and debug programs effectively.",
    pageNumber: 1,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  
  // Page 2 - Grading and Policies
  {
    content: "Grading Policy: Assignments (40%), Midterm Exam (20%), Final Exam (30%), Participation (10%). Late assignments will be accepted with a 10% penalty per day, up to 3 days late. After 3 days, no credit will be given. All assignments must be submitted via Gradescope before 11:59 PM on the due date.",
    pageNumber: 2,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Assignment Breakdown: 9 weekly assignments worth approximately 4.5% each. Assignments build upon each other, so it's important to complete them on time. Code must compile and run correctly. Partial credit will be given for code that demonstrates understanding but has minor errors.",
    pageNumber: 2,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Exam Schedule: Midterm Exam - Week 7 (November 18th), Final Exam - December 12th, 8:00 AM. Exams are closed book, but you may bring one 8.5x11 sheet of handwritten notes. Calculators are not permitted. You must bring your student ID to all exams.",
    pageNumber: 2,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  
  // Page 3 - Academic Integrity and Office Hours
  {
    content: "Academic Integrity: All work must be your own. Collaboration on assignments is not permitted unless explicitly stated. Plagiarism or cheating will result in a failing grade for the course and referral to the Office of Student Judicial Affairs. Using AI tools like ChatGPT to generate code is considered academic dishonesty.",
    pageNumber: 3,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Attendance Policy: Regular attendance is expected. Students are allowed 2 unexcused absences. More than 2 absences may result in grade reduction. Please notify the instructor in advance if you must miss class. Lecture slides and recordings will be posted on Canvas.",
    pageNumber: 3,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Office Hours: Monday/Wednesday 2-3 PM, Engineering 2, Room 218. You can also schedule appointments via email. Please include your full name and course number (CMPS 5J) in all correspondence. Email response time: within 24-48 hours on weekdays.",
    pageNumber: 3,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  
  // Week 1 - Introduction
  {
    content: "Week 1: Introduction to Java and Programming Environments\n\nTopics covered: What is programming? Introduction to Java language. Setting up development environment (Eclipse/IntelliJ IDEA). Your first Java program: HelloWorld. Compilation and execution process. Basic program structure: public class, main method. Understanding syntax errors vs logic errors.",
    pageNumber: 4,
    weekNumber: 1,
    topic: "Introduction to Java and Programming Environments",
    contentType: 'concept' as const,
  },
  {
    content: "Week 1 continued: Java program structure includes the class definition, the main method where program execution begins, and the System.out.println() statement for output. The Java compiler (javac) converts .java files into .class bytecode files. The Java Virtual Machine (JVM) executes the bytecode. Understanding the edit-compile-run cycle is fundamental.",
    pageNumber: 4,
    weekNumber: 1,
    topic: "Introduction to Java and Programming Environments",
    contentType: 'concept' as const,
  },
  
  // Week 2 - Variables and Data Types
  {
    content: "Week 2: Variables, Data Types, and Expressions\n\nTopics: Primitive data types (int, double, char, boolean). Variable declaration and initialization. Arithmetic operators (+, -, *, /, %). String basics. Type conversion (implicit and explicit casting). Input/output using Scanner class. Example: Calculator program that reads two numbers and performs operations.",
    pageNumber: 5,
    weekNumber: 2,
    topic: "Variables, Data Types, and Expressions",
    contentType: 'concept' as const,
  },
  {
    content: "Week 2 continued: Variable naming conventions follow camelCase. Variables must be declared before use. The Scanner class requires import java.util.Scanner; and is used to read input from the keyboard. Common methods: nextInt(), nextDouble(), nextLine(). Understanding the difference between int division and double division is crucial.",
    pageNumber: 5,
    weekNumber: 2,
    topic: "Variables, Data Types, and Expressions",
    contentType: 'concept' as const,
  },
  
  // Week 3 - Conditionals
  {
    content: "Week 3: Control Flow - Conditionals\n\nTopics: Boolean expressions. Relational operators (<, >, <=, >=, ==, !=). Logical operators (&&, ||, !). If/else statements. Switch statements. Nested conditionals. Example programs: Grade calculator (A, B, C, D, F), login system with password checking, temperature converter with different outputs based on range.",
    pageNumber: 6,
    weekNumber: 3,
    topic: "Control Flow - Conditionals",
    contentType: 'concept' as const,
  },
  {
    content: "Week 3 continued: The if-else structure allows programs to make decisions based on conditions. Boolean expressions evaluate to true or false. The equals() method is used for String comparison, not ==. Switch statements are useful when checking a variable against multiple constant values. Proper indentation and curly braces are essential for readability.",
    pageNumber: 6,
    weekNumber: 3,
    topic: "Control Flow - Conditionals",
    contentType: 'concept' as const,
  },
  
  // Week 4 - Loops
  {
    content: "Week 4: Loops and Iteration\n\nTopics: While loops - execute while condition is true. For loops - used when number of iterations is known. Do-while loops - guaranteed to execute at least once. Loop control (break, continue). Nested loops. Common patterns: counting, summing, searching. Example: Number guessing game, factorial calculator, multiplication table printer.",
    pageNumber: 7,
    weekNumber: 4,
    topic: "Loops and Iteration",
    contentType: 'concept' as const,
  },
  {
    content: "Week 4 continued: Infinite loops occur when the loop condition never becomes false. Always ensure loop variables are properly updated. For loops have three parts: initialization, condition, and update. Nested loops are useful for working with 2D arrays and patterns. Understanding loop scope is important - variables declared inside loops are local to that loop.",
    pageNumber: 7,
    weekNumber: 4,
    topic: "Loops and Iteration",
    contentType: 'concept' as const,
  },
  
  // Week 5 - Methods
  {
    content: "Week 5: Methods and Modular Design\n\nTopics: Method declaration and invocation. Parameters (formal vs actual). Return values and return statements. Method overloading - multiple methods with same name but different parameters. Scope and lifetime of variables (local vs instance). Top-down design - breaking large problems into smaller methods. Example: Breaking programs into methods.",
    pageNumber: 8,
    weekNumber: 5,
    topic: "Methods and Modular Design",
    contentType: 'concept' as const,
  },
  {
    content: "Week 5 continued: Methods improve code reusability and organization. The main method is static, meaning it belongs to the class rather than an instance. Non-static methods require an object to call. Void methods don't return a value. Methods with return types must have a return statement. Method parameters are passed by value for primitives, by reference for objects.",
    pageNumber: 8,
    weekNumber: 5,
    topic: "Methods and Modular Design",
    contentType: 'concept' as const,
  },
  
  // Week 6 - Arrays
  {
    content: "Week 6: Arrays\n\nTopics: Array declaration and initialization. Accessing array elements using index (0-based indexing). Array length property. Common array algorithms: searching (linear search), finding max/min, calculating sum/average. Basic sorting algorithms (selection sort introduction). Multi-dimensional arrays (2D arrays). Example: Grade book program that stores and processes student grades.",
    pageNumber: 9,
    weekNumber: 6,
    topic: "Arrays",
    contentType: 'concept' as const,
  },
  {
    content: "Week 6 continued: Arrays are fixed-size collections of elements of the same type. Array indices start at 0 and go up to length-1. ArrayIndexOutOfBoundsException occurs when accessing invalid indices. Arrays are objects in Java, stored in the heap. For-each loops (enhanced for loops) simplify array iteration when you don't need the index. 2D arrays are arrays of arrays.",
    pageNumber: 9,
    weekNumber: 6,
    topic: "Arrays",
    contentType: 'concept' as const,
  },
  
  // Week 7 - OOP Basics
  {
    content: "Week 7: Object-Oriented Programming - Classes and Objects\n\nTopics: Introduction to OOP concepts (encapsulation, abstraction). Classes vs objects (blueprint vs instance). Instance variables (attributes/fields). Instance methods (behaviors). Constructors - special methods for object initialization. Access modifiers (public, private). Example: Creating a BankAccount class with deposit, withdraw, and getBalance methods.",
    pageNumber: 10,
    weekNumber: 7,
    topic: "Object-Oriented Programming - Classes and Objects",
    contentType: 'concept' as const,
  },
  {
    content: "Week 7 continued: Objects are instances of classes. The 'new' keyword creates objects. Constructors have the same name as the class and no return type. Default constructors are provided if none are defined. Private instance variables provide encapsulation - data is hidden and accessed through public methods. The this keyword refers to the current object. Getters and setters provide controlled access to private data.",
    pageNumber: 10,
    weekNumber: 7,
    topic: "Object-Oriented Programming - Classes and Objects",
    contentType: 'concept' as const,
  },
  
  // Week 8 - Inheritance
  {
    content: "Week 8: Object-Oriented Programming - Inheritance and Polymorphism\n\nTopics: Inheritance basics - IS-A relationship. extends keyword. Method overriding - providing new implementation in subclass. super keyword - accessing parent class members. Polymorphism - treating subclass as parent type. Example: Shape hierarchy with Circle, Rectangle, and Square classes extending Shape base class.",
    pageNumber: 11,
    weekNumber: 8,
    topic: "Object-Oriented Programming - Inheritance and Polymorphism",
    contentType: 'concept' as const,
  },
  {
    content: "Week 8 continued: Inheritance promotes code reuse. A subclass inherits all public and protected members from the parent class. The @Override annotation indicates a method is overriding a parent method. Polymorphism allows a reference variable of parent type to refer to subclass objects. Dynamic method dispatch - the actual method called depends on the object type, not the reference type.",
    pageNumber: 11,
    weekNumber: 8,
    topic: "Object-Oriented Programming - Inheritance and Polymorphism",
    contentType: 'concept' as const,
  },
  
  // Week 9 - File I/O and Exceptions
  {
    content: "Week 9: File I/O and Exception Handling\n\nTopics: Reading from files using FileReader and BufferedReader. Writing to files using FileWriter and PrintWriter. Exception handling - try-catch blocks. Common exceptions: FileNotFoundException, IOException. Finally blocks for cleanup. Example: Processing data from CSV file, writing results to output file. Creating a program that reads student data and generates a report.",
    pageNumber: 12,
    weekNumber: 9,
    topic: "File I/O and Exception Handling",
    contentType: 'concept' as const,
  },
  {
    content: "Week 9 continued: File I/O operations can throw checked exceptions that must be handled. The try-catch block allows graceful error handling. Multiple catch blocks can handle different exception types. Finally blocks always execute, useful for closing files. The throws keyword in method signature delegates exception handling to the caller. Always close file streams to prevent resource leaks.",
    pageNumber: 12,
    weekNumber: 9,
    topic: "File I/O and Exception Handling",
    contentType: 'concept' as const,
  },
  
  // Week 10 - Final Review
  {
    content: "Week 10: Final Project and Review\n\nTopics: Course review covering all major concepts from Weeks 1-9. Final project presentations - students demonstrate programs using classes, inheritance, and file I/O. Advanced topics preview: data structures (ArrayList, HashMap), recursion, algorithms. Exam preparation strategies. Office hours extended for questions. Final exam will be comprehensive, covering all course material.",
    pageNumber: 12,
    weekNumber: 10,
    topic: "Final Project and Review",
    contentType: 'concept' as const,
  },
  
  // Additional detailed policy chunks
  {
    content: "Textbook: 'Java: An Introduction to Problem Solving and Programming' by Walter Savitch, 8th Edition. The textbook is available at the campus bookstore and online. Reading assignments are listed in the schedule. Students are expected to read assigned chapters before each class. Example problems from the textbook will be discussed in lecture.",
    pageNumber: 3,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Course Website: All course materials including lecture slides, assignments, grades, and announcements are posted on Canvas. Students should check Canvas daily for updates. Gradescope is used for assignment submission. Make sure you have access to both platforms by Week 1. Technical support is available through IT Services if you have login issues.",
    pageNumber: 3,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Drop/Withdraw Policy: The last day to drop the course without a W is Week 3. The last day to withdraw with a W is Week 8. After Week 8, withdrawals are not permitted except in extenuating circumstances. Students considering dropping should consult with the instructor and their academic advisor. Late withdrawals require petition approval from the registrar's office.",
    pageNumber: 4,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Incomplete Grades: Incomplete grades (I) may be assigned only in exceptional circumstances when a student has completed most of the coursework but cannot finish due to documented emergencies. The student must contact the instructor before final exams to request an incomplete. An Incomplete Completion Agreement must be signed. Work must be completed within one quarter.",
    pageNumber: 4,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  {
    content: "Extra Credit: There are no extra credit assignments in this course. Grades are based solely on the components listed in the grading policy. Students are encouraged to attend office hours, participate in class discussions, and complete all assignments on time to maximize their grade. Focus on mastering the core concepts rather than seeking additional points.",
    pageNumber: 4,
    weekNumber: null,
    topic: null,
    contentType: 'policy' as const,
  },
  
  // Expanded Week 1 - More details
  {
    content: "Week 1: Java Program Structure Explained\n\nEvery Java program must have at least one class. The class name must match the filename. Inside the class, you need a main method: public static void main(String[] args). This is the entry point where program execution begins. The System.out.println() statement prints text to the console. Semicolons end statements in Java. Curly braces {} define blocks of code.",
    pageNumber: 4,
    weekNumber: 1,
    topic: "Introduction to Java and Programming Environments",
    contentType: 'concept' as const,
  },
  {
    content: "Week 1: Common First Program Errors\n\nBeginners often forget semicolons, mismatched curly braces, or incorrect capitalization (Java is case-sensitive). 'Public' is different from 'public'. Missing quotes around strings causes errors. Forgetting to save the file before compiling. Using the wrong file extension (.txt instead of .java). Understanding these common mistakes helps with debugging.",
    pageNumber: 4,
    weekNumber: 1,
    topic: "Introduction to Java and Programming Environments",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 2 - More details
  {
    content: "Week 2: Data Type Details\n\nint stores whole numbers (positive, negative, zero) from -2^31 to 2^31-1. double stores decimal numbers with approximately 15 decimal digits of precision. char stores a single character enclosed in single quotes. boolean stores only true or false values. String is actually a class, not a primitive type, and strings must be in double quotes. Understanding these types prevents type-related errors.",
    pageNumber: 5,
    weekNumber: 2,
    topic: "Variables, Data Types, and Expressions",
    contentType: 'concept' as const,
  },
  {
    content: "Week 2: Scanner Input Tips\n\nAlways create the Scanner once at the top of main: Scanner input = new Scanner(System.in); After reading a number with nextInt() or nextDouble(), if you need to read a line of text next, you may need to call nextLine() twice - once to consume the newline character left by the number input. This is a common source of bugs for beginners. Example: int num = input.nextInt(); input.nextLine(); String text = input.nextLine();",
    pageNumber: 5,
    weekNumber: 2,
    topic: "Variables, Data Types, and Expressions",
    contentType: 'concept' as const,
  },
  {
    content: "Week 2: Type Casting Examples\n\nExplicit casting: double price = 19.99; int dollars = (int) price; This truncates to 19. Implicit casting: int count = 5; double result = count / 2.0; Result is 2.5 because 2.0 is double. Watch out: int result = count / 2; This gives 2 (integer division truncates). Always use 2.0 or cast to get decimal results when needed.",
    pageNumber: 6,
    weekNumber: 2,
    topic: "Variables, Data Types, and Expressions",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 3 - More details
  {
    content: "Week 3: Boolean Logic Deep Dive\n\nThe && operator returns true only if both conditions are true. The || operator returns true if at least one condition is true. The ! operator negates a boolean value. Short-circuit evaluation: if the first condition of && is false, Java doesn't evaluate the second. Similarly, if the first condition of || is true, Java doesn't evaluate the second. This can be used for efficiency and safety.",
    pageNumber: 6,
    weekNumber: 3,
    topic: "Control Flow - Conditionals",
    contentType: 'concept' as const,
  },
  {
    content: "Week 3: Nested If-Else Patterns\n\nYou can nest if-else statements inside other if-else statements. Always use curly braces to make the structure clear, even when optional. Proper indentation is crucial for readability. Example: if (grade >= 90) { if (grade >= 97) letter = 'A+'; else letter = 'A'; } else if (grade >= 80) letter = 'B'; Use else-if chains to check multiple conditions in sequence.",
    pageNumber: 7,
    weekNumber: 3,
    topic: "Control Flow - Conditionals",
    contentType: 'concept' as const,
  },
  {
    content: "Week 3: Switch Statement Details\n\nSwitch statements work with byte, short, int, char, String, and enum types. Each case must end with a break statement (or return) to prevent fall-through to the next case. The default case handles values that don't match any case. Switch statements are more readable than long if-else chains when checking a single variable against multiple constant values. Example: switch (grade) { case 'A': points = 4; break; case 'B': points = 3; break; default: points = 0; }",
    pageNumber: 7,
    weekNumber: 3,
    topic: "Control Flow - Conditionals",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 4 - More details
  {
    content: "Week 4: Loop Patterns and Best Practices\n\nCounting loops: for (int i = 0; i < 10; i++) { ... } - runs 10 times with i from 0 to 9. Summing loops: int sum = 0; for (int num : numbers) { sum += num; } - accumulates values. Searching loops: boolean found = false; for (int item : list) { if (item == target) { found = true; break; } } - stops when found. Always initialize loop variables before the loop.",
    pageNumber: 7,
    weekNumber: 4,
    topic: "Loops and Iteration",
    contentType: 'concept' as const,
  },
  {
    content: "Week 4: Avoiding Infinite Loops\n\nCommon causes: Forgetting to increment the loop variable in a while loop. Using the wrong comparison operator (using == instead of != in loop condition). Not updating variables that affect the loop condition. To debug infinite loops: Add print statements to see loop variable values. Check that the loop condition will eventually become false. Use a counter with a maximum limit as a safety measure.",
    pageNumber: 8,
    weekNumber: 4,
    topic: "Loops and Iteration",
    contentType: 'concept' as const,
  },
  {
    content: "Week 4: Nested Loops Explained\n\nNested loops are loops inside other loops. The outer loop runs first, and for each iteration, the inner loop completes all its iterations. Example: for (int i = 0; i < 3; i++) { for (int j = 0; j < 2; j++) { System.out.print(i + \"-\" + j + \" \"); } } Output: 0-0 0-1 1-0 1-1 2-0 2-1. Total iterations = outer iterations × inner iterations. Use nested loops for 2D arrays, patterns, and matrix operations.",
    pageNumber: 8,
    weekNumber: 4,
    topic: "Loops and Iteration",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 5 - More details
  {
    content: "Week 5: Method Parameters and Return Values\n\nParameters are variables declared in the method signature. Arguments are the actual values passed when calling the method. Parameters are passed by value for primitives (a copy is made) and by reference for objects (the reference is copied, but both point to the same object). Return values are specified with the return keyword followed by an expression matching the return type. Void methods have no return value.",
    pageNumber: 8,
    weekNumber: 5,
    topic: "Methods and Modular Design",
    contentType: 'concept' as const,
  },
  {
    content: "Week 5: Method Overloading\n\nMethod overloading means having multiple methods with the same name but different parameter lists. The compiler determines which method to call based on the number and types of arguments. Example: public static int add(int a, int b) and public static double add(double a, double b) can coexist. Overloading improves code readability by allowing intuitive method names for different data types. Return type alone cannot distinguish overloaded methods - the parameters must differ.",
    pageNumber: 9,
    weekNumber: 5,
    topic: "Methods and Modular Design",
    contentType: 'concept' as const,
  },
  {
    content: "Week 5: Variable Scope Rules\n\nLocal variables are declared inside a method and only accessible within that method. They exist only while the method is executing. Instance variables are declared in a class (outside methods) and belong to each object. They persist as long as the object exists. Variables declared in loops or if blocks are only accessible within those blocks. Understanding scope prevents 'variable not found' errors.",
    pageNumber: 9,
    weekNumber: 5,
    topic: "Methods and Modular Design",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 6 - More details
  {
    content: "Week 6: Array Initialization Methods\n\nDeclaration: int[] numbers; (creates a reference, not an array yet). Initialization: numbers = new int[5]; (creates array with 5 elements, all initialized to 0). Combined: int[] numbers = new int[5];. Array literal: int[] numbers = {1, 2, 3, 4, 5}; (creates and initializes in one line). Length: numbers.length (not numbers.length() - arrays don't have methods). Arrays are fixed-size - cannot resize after creation.",
    pageNumber: 9,
    weekNumber: 6,
    topic: "Arrays",
    contentType: 'concept' as const,
  },
  {
    content: "Week 6: Common Array Algorithms\n\nFinding maximum: int max = arr[0]; for (int i = 1; i < arr.length; i++) { if (arr[i] > max) max = arr[i]; }. Finding index of value: for (int i = 0; i < arr.length; i++) { if (arr[i] == target) return i; } return -1;. Calculating average: double sum = 0; for (int value : arr) sum += value; double avg = sum / arr.length;. Copying array: int[] copy = new int[arr.length]; for (int i = 0; i < arr.length; i++) copy[i] = arr[i];",
    pageNumber: 10,
    weekNumber: 6,
    topic: "Arrays",
    contentType: 'concept' as const,
  },
  {
    content: "Week 6: Two-Dimensional Arrays\n\n2D arrays are arrays of arrays. Declaration: int[][] matrix = new int[3][4]; creates a 3x4 grid (3 rows, 4 columns). Access: matrix[1][2] accesses row 1, column 2. Initialization: int[][] matrix = {{1,2,3}, {4,5,6}, {7,8,9}};. Nested loops are used to process 2D arrays: for (int i = 0; i < matrix.length; i++) { for (int j = 0; j < matrix[i].length; j++) { ... } }. Useful for grids, tables, and matrices.",
    pageNumber: 10,
    weekNumber: 6,
    topic: "Arrays",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 7 - More details
  {
    content: "Week 7: Creating Your First Class\n\nExample BankAccount class: public class BankAccount { private double balance; public BankAccount(double initialBalance) { balance = initialBalance; } public void deposit(double amount) { balance += amount; } public void withdraw(double amount) { if (amount <= balance) balance -= amount; } public double getBalance() { return balance; } }. The private keyword hides the balance variable - it can only be accessed through public methods. This is encapsulation.",
    pageNumber: 10,
    weekNumber: 7,
    topic: "Object-Oriented Programming - Classes and Objects",
    contentType: 'concept' as const,
  },
  {
    content: "Week 7: Understanding the 'this' Keyword\n\nThe 'this' keyword refers to the current object. Use it when parameter names match instance variable names: public void setAge(int age) { this.age = age; } - this.age is the instance variable, age is the parameter. You can also use it to call other constructors: public Student(String name) { this(name, 0); } calls another constructor. Using 'this' improves code clarity and prevents naming conflicts.",
    pageNumber: 11,
    weekNumber: 7,
    topic: "Object-Oriented Programming - Classes and Objects",
    contentType: 'concept' as const,
  },
  {
    content: "Week 7: Getters and Setters Pattern\n\nGetters (accessors) are methods that return the value of a private variable: public String getName() { return name; }. Setters (mutators) are methods that modify a private variable: public void setName(String name) { this.name = name; }. This pattern provides controlled access to private data. You can add validation in setters: public void setAge(int age) { if (age >= 0) this.age = age; }. Always make instance variables private and provide public getters/setters when needed.",
    pageNumber: 11,
    weekNumber: 7,
    topic: "Object-Oriented Programming - Classes and Objects",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 8 - More details
  {
    content: "Week 8: Inheritance Example - Shape Hierarchy\n\nBase class: public class Shape { protected String color; public double getArea() { return 0; } }. Subclass: public class Circle extends Shape { private double radius; public Circle(double radius) { this.radius = radius; } @Override public double getArea() { return Math.PI * radius * radius; } }. The extends keyword establishes inheritance. Circle inherits the color field and can override getArea() with its own implementation.",
    pageNumber: 11,
    weekNumber: 8,
    topic: "Object-Oriented Programming - Inheritance and Polymorphism",
    contentType: 'concept' as const,
  },
  {
    content: "Week 8: The 'super' Keyword\n\nThe super keyword refers to the parent class. super() calls the parent constructor and must be the first line in a child constructor. super.methodName() calls a parent class method. Example: public class Rectangle extends Shape { public Rectangle() { super(); // calls Shape constructor } @Override public String toString() { return super.toString() + \" with length \" + length; } }. super is essential when overriding methods but want to extend parent behavior.",
    pageNumber: 12,
    weekNumber: 8,
    topic: "Object-Oriented Programming - Inheritance and Polymorphism",
    contentType: 'concept' as const,
  },
  {
    content: "Week 8: Polymorphism in Action\n\nPolymorphism allows a parent reference to point to a child object: Shape s = new Circle(5.0);. When calling an overridden method, the child's version is executed: double area = s.getArea(); // calls Circle's getArea(), not Shape's. This is dynamic method dispatch. Polymorphism enables writing flexible code that works with any Shape subclass. Example: Shape[] shapes = {new Circle(3), new Rectangle(4,5)}; for (Shape s : shapes) { System.out.println(s.getArea()); }.",
    pageNumber: 12,
    weekNumber: 8,
    topic: "Object-Oriented Programming - Inheritance and Polymorphism",
    contentType: 'concept' as const,
  },
  
  // Expanded Week 9 - More details
  {
    content: "Week 9: Reading from Files Step-by-Step\n\n1. Import: import java.io.*;. 2. Create FileReader: FileReader fr = new FileReader(\"data.txt\");. 3. Wrap in BufferedReader: BufferedReader br = new BufferedReader(fr);. 4. Read lines: String line = br.readLine(); (returns null when end of file). 5. Close: br.close();. Always wrap in try-catch for FileNotFoundException and IOException. Use a while loop to read all lines: while ((line = br.readLine()) != null) { process(line); }.",
    pageNumber: 12,
    weekNumber: 9,
    topic: "File I/O and Exception Handling",
    contentType: 'concept' as const,
  },
  {
    content: "Week 9: Writing to Files\n\n1. Create FileWriter: FileWriter fw = new FileWriter(\"output.txt\");. 2. Wrap in PrintWriter: PrintWriter pw = new PrintWriter(fw);. 3. Write: pw.println(\"Hello\"); or pw.print(\"text\");. 4. Close: pw.close();. The PrintWriter class provides convenient methods like print() and println() that work like System.out. Always close file writers to ensure data is written. Use try-with-resources for automatic closing: try (PrintWriter pw = new PrintWriter(new FileWriter(\"file.txt\"))) { pw.println(\"data\"); }.",
    pageNumber: 13,
    weekNumber: 9,
    topic: "File I/O and Exception Handling",
    contentType: 'concept' as const,
  },
  {
    content: "Week 9: Exception Handling Patterns\n\nBasic try-catch: try { riskyCode(); } catch (ExceptionType e) { handleError(); }. Multiple catches: catch (FileNotFoundException e) { ... } catch (IOException e) { ... }. Order matters - catch more specific exceptions first. Finally block: always executes, used for cleanup like closing files. Try-with-resources: automatically closes resources. Common exceptions: NullPointerException (null reference), ArrayIndexOutOfBoundsException (invalid array index), ArithmeticException (division by zero).",
    pageNumber: 13,
    weekNumber: 9,
    topic: "File I/O and Exception Handling",
    contentType: 'concept' as const,
  },
  
  // Additional concept chunks for common questions
  {
    content: "Debugging Tips: Always read error messages carefully - they tell you the file and line number. Syntax errors prevent compilation - fix these first. Logic errors produce incorrect output - use print statements to trace execution. Use a debugger in your IDE (set breakpoints, step through code). Test with simple inputs first, then try edge cases. Comment out code to isolate problems. Start with a working version and make small changes.",
    pageNumber: 13,
    weekNumber: null,
    topic: null,
    contentType: 'concept' as const,
  },
  {
    content: "Common Compilation Errors: Missing semicolons - ';' expected. Unclosed parentheses or braces - mismatched brackets. Undefined variables - variable not found. Type mismatches - cannot convert from type A to type B. Missing return statement - method must return a value. Package does not exist - missing import statement. Understanding these errors helps fix problems quickly. Always fix the first error first - subsequent errors may be caused by it.",
    pageNumber: 13,
    weekNumber: null,
    topic: null,
    contentType: 'concept' as const,
  },
  {
    content: "Coding Best Practices: Use meaningful variable names (balance not b, studentName not sn). Add comments to explain complex logic. Write code in small steps and test frequently. Keep methods short and focused on one task. Follow consistent indentation and formatting. Use constants for magic numbers: final int MAX_SIZE = 100; instead of hardcoding 100. Check for edge cases: empty input, null values, boundary conditions. Write code that's easy to read and understand.",
    pageNumber: 14,
    weekNumber: null,
    topic: null,
    contentType: 'concept' as const,
  },
]

// 10-week schedule for quarter system
export const DEMO_SCHEDULE = [
  {
    weekNumber: 1,
    topic: "Introduction to Java and Programming Environments",
    assignments: "Assignment 1: HelloWorld and basic I/O program",
    readings: "Java Basics - Chapters 1-2, Setting up development environment tutorial",
    dueDate: "2024-10-07",
  },
  {
    weekNumber: 2,
    topic: "Variables, Data Types, and Expressions",
    assignments: "Assignment 2: Calculator program with user input",
    readings: "Variables and Expressions - Chapter 3, Scanner class documentation",
    dueDate: "2024-10-14",
  },
  {
    weekNumber: 3,
    topic: "Control Flow - Conditionals",
    assignments: "Assignment 3: Grade calculator with if-else logic",
    readings: "Control Flow - Chapter 4, Boolean logic exercises",
    dueDate: "2024-10-21",
  },
  {
    weekNumber: 4,
    topic: "Loops and Iteration",
    assignments: "Assignment 4: Number guessing game with loops",
    readings: "Loops - Chapter 5, Loop patterns and algorithms",
    dueDate: "2024-10-28",
  },
  {
    weekNumber: 5,
    topic: "Methods and Modular Design",
    assignments: "Assignment 5: Methods practice - refactoring previous assignments",
    readings: "Methods - Chapter 6, Top-down design principles",
    dueDate: "2024-11-04",
  },
  {
    weekNumber: 6,
    topic: "Arrays",
    assignments: "Assignment 6: Array operations - grade book system",
    readings: "Arrays - Chapter 7, Array algorithms and searching",
    dueDate: "2024-11-11",
  },
  {
    weekNumber: 7,
    topic: "Object-Oriented Programming - Classes and Objects",
    assignments: "Assignment 7: BankAccount class implementation, Midterm Exam: November 18",
    readings: "OOP Basics - Chapter 8, Encapsulation and class design",
    dueDate: "2024-11-18",
  },
  {
    weekNumber: 8,
    topic: "Object-Oriented Programming - Inheritance and Polymorphism",
    assignments: "Assignment 8: Shape hierarchy with inheritance",
    readings: "Inheritance - Chapter 9, Polymorphism examples",
    dueDate: "2024-11-25",
  },
  {
    weekNumber: 9,
    topic: "File I/O and Exception Handling",
    assignments: "Assignment 9: File processing program, Final Project assigned",
    readings: "File I/O - Chapter 10, Exception handling patterns",
    dueDate: "2024-12-02",
  },
  {
    weekNumber: 10,
    topic: "Final Project and Review",
    assignments: "Final Project due: December 10, Final Exam: December 12, 8:00 AM",
    readings: "Review all chapters 1-10, Practice exam questions",
    dueDate: "2024-12-12",
  },
]

// Sample announcements - mix of published and draft
export const DEMO_ANNOUNCEMENTS = [
  {
    weekNumber: 1,
    title: "Week 1: Welcome to CMPS 5J!",
    content: "Welcome to CMPS 5J - Introduction to Programming in Java! This week we'll cover the basics of Java and setting up your development environment. Please download Eclipse or IntelliJ IDEA before class starts. Assignment 1 is posted on Canvas and due next Monday at 11:59 PM. Office hours: Mon/Wed 2-3 PM in Engineering 2, Room 218. Don't hesitate to ask questions!",
    status: 'published' as const,
  },
  {
    weekNumber: 2,
    title: "Week 2: Variables and Data Types",
    content: "This week we're diving into variables, data types, and the Scanner class for input. Make sure to practice with the in-class examples. Assignment 2 focuses on creating a calculator program. Remember: late assignments lose 10% per day. Office hours are available if you get stuck!",
    status: 'published' as const,
  },
  {
    weekNumber: 4,
    title: "Week 4: Loops - Important Concepts",
    content: "Loops are fundamental to programming. This week we cover while, for, and do-while loops. Practice with the examples in the textbook. Assignment 4 is the number guessing game - make sure to handle edge cases. Don't forget: loop variables must be updated to avoid infinite loops!",
    status: 'published' as const,
  },
  {
    weekNumber: 6,
    title: "Week 6: Midterm Exam Reminder",
    content: "Reminder: Midterm exam is next week (Week 7, November 18th). It will cover material from Weeks 1-6, focusing on variables, control flow, methods, and arrays. Review sessions will be held during office hours this week. Bring your student ID and one handwritten notes sheet to the exam. Study the practice problems posted on Canvas.",
    status: 'draft' as const,
  },
  {
    weekNumber: 9,
    title: "Week 9: Final Project Guidelines and File I/O",
    content: "Final project guidelines have been posted on Canvas. Projects must demonstrate use of classes, inheritance, file I/O, and exception handling. Projects are due December 10th - no late submissions accepted. Schedule a meeting with me during office hours if you need project ideas or have questions. This week we're also covering file I/O - crucial for your final project!",
    status: 'published' as const,
  },
]

// Sample chat logs showing different query types - expanded for better demo
export const DEMO_CHAT_LOGS = [
  {
    message: "When is the midterm exam?",
    response: "The midterm exam is scheduled for Week 7 on November 18th. It will cover material from Weeks 1-6, including variables, control flow, methods, and arrays. The exam is worth 20% of your grade. See the syllabus page 2 for more details about the exam format and what to bring.",
    agent: 'POLICY' as const,
    citations: [{ source: "Syllabus page 2", content: "Midterm Exam - Week 7 (November 18th), 20% of grade" }],
  },
  {
    message: "What happens if I turn in an assignment late?",
    response: "Late assignments are accepted with a 10% penalty per day, up to 3 days late. After 3 days, no credit will be given. For example, if an assignment is worth 100 points and you submit it 1 day late, you'll receive a maximum of 90 points. See syllabus page 2 for the complete grading policy.",
    agent: 'POLICY' as const,
    citations: [{ source: "Syllabus page 2", content: "Late assignments: 10% penalty per day, up to 3 days late" }],
  },
  {
    message: "Can you explain how inheritance works in Java?",
    response: "Inheritance allows a class to inherit properties and methods from a parent class. In Java, you use the 'extends' keyword. For example, a Circle class can extend a Shape class and inherit methods like getArea(). The subclass can override parent methods using @Override. This is covered in Week 8 - Object-Oriented Programming: Inheritance and Polymorphism.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 8: Inheritance and Polymorphism", content: "Inheritance allows code reuse. A subclass inherits all public and protected members from the parent class." }],
  },
  {
    message: "What's the difference between for loops and while loops?",
    response: "For loops are used when you know the number of iterations beforehand - they have initialization, condition, and update in one line. While loops are used when the number of iterations is unknown and depends on a condition. Do-while loops guarantee at least one execution. This is covered in Week 4 - Loops and Iteration.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 4: Loops and Iteration", content: "While loops execute while condition is true. For loops used when number of iterations is known." }],
  },
  {
    message: "How do I read input from the user in Java?",
    response: "You use the Scanner class. First, import it: import java.util.Scanner; Then create a Scanner object: Scanner input = new Scanner(System.in); Use methods like nextInt() for integers, nextDouble() for decimals, and nextLine() for strings. This is covered in Week 2 - Variables, Data Types, and Expressions.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 2: Variables, Data Types, and Expressions", content: "Input/output using Scanner class. Common methods: nextInt(), nextDouble(), nextLine()." }],
  },
  {
    message: "What are office hours?",
    response: "Office hours are Monday/Wednesday 2-3 PM in Engineering 2, Room 218. You can come with questions about assignments, concepts, or get help with your code. You can also schedule appointments via email. Include your full name and CMPS 5J in all correspondence. See syllabus page 3 for contact information.",
    agent: 'POLICY' as const,
    citations: [{ source: "Syllabus page 3", content: "Office Hours: Monday/Wednesday 2-3 PM, Engineering 2, Room 218" }],
  },
  {
    message: "I'm sick and can't submit Assignment 3 on time. Can I get an extension?",
    response: "I've created an escalation for your professor to review your extension request. You'll receive a response soon. In the meantime, please note the late policy allows submissions up to 3 days late with penalty. For medical emergencies, contact your professor directly with documentation.",
    agent: 'ESCALATE' as const,
    escalated: true,
  },
  {
    message: "Explain what an array index is",
    response: "An array index is the position of an element in an array. In Java, array indices start at 0 (not 1). So the first element is at index 0, the second at index 1, etc. The last element is at index length-1. Trying to access an invalid index causes an ArrayIndexOutOfBoundsException. This is covered in Week 6 - Arrays.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 6: Arrays", content: "Accessing array elements using index (0-based indexing). Array indices start at 0." }],
  },
  {
    message: "When is the final exam?",
    response: "The final exam is scheduled for December 12th at 8:00 AM. It will be comprehensive, covering all material from Weeks 1-10. You may bring one 8.5x11 sheet of handwritten notes. Bring your student ID. See syllabus page 2 for complete exam policies.",
    agent: 'POLICY' as const,
    citations: [{ source: "Syllabus page 2", content: "Final Exam - December 12th, 8:00 AM, 30% of grade" }],
  },
  {
    message: "What is a constructor in Java?",
    response: "A constructor is a special method used to initialize objects when they are created. It has the same name as the class and no return type (not even void). Constructors are called when you use the 'new' keyword. If you don't define a constructor, Java provides a default one. This is covered in Week 7 - Object-Oriented Programming: Classes and Objects.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 7: Classes and Objects", content: "Constructors - special methods for object initialization. Constructors have the same name as the class and no return type." }],
  },
  {
    message: "How many assignments are there total?",
    response: "There are 9 weekly assignments worth approximately 4.5% each, totaling 40% of your grade. Assignments build upon each other, so it's important to complete them on time. Code must compile and run correctly. See syllabus page 2 for the complete assignment breakdown.",
    agent: 'POLICY' as const,
    citations: [{ source: "Syllabus page 2", content: "9 weekly assignments worth approximately 4.5% each" }],
  },
  {
    message: "What is the difference between int and double?",
    response: "int stores whole numbers (integers) like 5, -10, 0, from -2^31 to 2^31-1. double stores decimal numbers (floating-point) like 3.14, -0.5, with approximately 15 decimal digits of precision. Use int for counting and whole numbers. Use double for calculations requiring decimals. This is covered in Week 2 - Variables, Data Types, and Expressions.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 2: Variables, Data Types, and Expressions", content: "Primitive data types (int, double, char, boolean). int stores whole numbers, double stores decimal numbers." }],
  },
  {
    message: "Why do I get an error when comparing strings with ==?",
    response: "The == operator compares references (memory addresses), not the content of strings. For string content comparison, use the equals() method: if (str1.equals(str2)). The equalsIgnoreCase() method compares ignoring case differences. This is covered in Week 3 - Control Flow: Conditionals. Always use equals() for String comparison, never ==.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 3: Control Flow - Conditionals", content: "The equals() method is used for String comparison, not ==." }],
  },
  {
    message: "How do I fix an infinite loop?",
    response: "Infinite loops occur when the loop condition never becomes false. Common causes: forgetting to increment the loop variable, using wrong comparison operator, or not updating variables that affect the condition. Add print statements to see loop variable values. Check that the condition will eventually become false. This is covered in Week 4 - Loops and Iteration.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 4: Loops and Iteration", content: "Infinite loops occur when the loop condition never becomes false. Always ensure loop variables are properly updated." }],
  },
  {
    message: "What does the 'this' keyword do?",
    response: "The 'this' keyword refers to the current object. Use it when parameter names match instance variable names: public void setAge(int age) { this.age = age; }. 'this.age' is the instance variable, 'age' is the parameter. It can also call other constructors. This is covered in Week 7 - Object-Oriented Programming: Classes and Objects.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 7: Classes and Objects", content: "The this keyword refers to the current object. Use it when parameter names match instance variable names." }],
  },
  {
    message: "Can I bring a calculator to the exam?",
    response: "No, calculators are not permitted on exams. However, you may bring one 8.5x11 sheet of handwritten notes (front and back). This sheet can contain formulas, examples, or code snippets. You must also bring your student ID to all exams. See syllabus page 2 for complete exam policies.",
    agent: 'POLICY' as const,
    citations: [{ source: "Syllabus page 2", content: "Exams are closed book, but you may bring one 8.5x11 sheet of handwritten notes. Calculators are not permitted." }],
  },
  {
    message: "What is polymorphism?",
    response: "Polymorphism allows a parent reference to point to a child object: Shape s = new Circle(5.0);. When calling an overridden method, the child's version is executed. This enables writing flexible code that works with any Shape subclass. This is covered in Week 8 - Object-Oriented Programming: Inheritance and Polymorphism.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 8: Inheritance and Polymorphism", content: "Polymorphism allows a reference variable of parent type to refer to subclass objects. Dynamic method dispatch." }],
  },
  {
    message: "How do I read a file in Java?",
    response: "Use FileReader and BufferedReader: FileReader fr = new FileReader('file.txt'); BufferedReader br = new BufferedReader(fr); String line = br.readLine(); Always wrap in try-catch for FileNotFoundException and IOException. Use a while loop to read all lines. Don't forget to close the file with br.close(). This is covered in Week 9 - File I/O and Exception Handling.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 9: File I/O and Exception Handling", content: "Reading from files using FileReader and BufferedReader. The readLine() method returns null when end of file." }],
  },
  {
    message: "What is a try-catch block?",
    response: "Try-catch blocks handle exceptions gracefully. Code that might throw an exception goes in the try block. If an exception occurs, the catch block handles it: try { riskyCode(); } catch (IOException e) { handleError(); }. Multiple catch blocks can handle different exception types. Finally blocks always execute for cleanup. This is covered in Week 9 - File I/O and Exception Handling.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 9: File I/O and Exception Handling", content: "Exception handling - try-catch blocks. Multiple catch blocks can handle different exception types." }],
  },
  {
    message: "I'm struggling with nested loops. Can you help?",
    response: "Nested loops are loops inside other loops. The outer loop runs first, and for each iteration, the inner loop completes all its iterations. Example: for (int i = 0; i < 3; i++) { for (int j = 0; j < 2; j++) { ... } } runs 6 times total (3 × 2). Use nested loops for 2D arrays and patterns. This is covered in Week 4 - Loops and Iteration.",
    agent: 'CONCEPT' as const,
    citations: [{ source: "Week 4: Loops and Iteration", content: "Nested loops are loops inside other loops. Total iterations = outer iterations × inner iterations." }],
  },
]

// Sample escalations - expanded for better demo
export const DEMO_ESCALATIONS = [
  {
    query: "I'm sick and can't submit Assignment 3 on time. Can I get an extension?",
    status: 'pending' as const,
    category: "Extension Request",
  },
  {
    query: "I think there might be an error in my midterm grade. I calculated my score and it should be higher than what's posted.",
    status: 'pending' as const,
    category: "Grade Dispute",
  },
  {
    query: "I'm struggling with object-oriented programming concepts, especially inheritance. Can I schedule extra help outside of regular office hours?",
    status: 'pending' as const,
    category: "Academic Support",
  },
  {
    query: "I have a family emergency and need to miss next week's classes. What should I do about the assignments?",
    status: 'pending' as const,
    category: "Personal Issue",
  },
  {
    query: "I'm having technical issues with Gradescope and couldn't submit Assignment 5. The file uploaded but shows as corrupted. Can I resubmit?",
    status: 'pending' as const,
    category: "Technical Issue",
  },
  {
    query: "I have accommodations from the Disability Resource Center. Who should I contact about getting extra time on the final exam?",
    status: 'pending' as const,
    category: "Accommodations",
  },
  {
    query: "I lost my notes sheet before the midterm. Is there a way to get a replacement or can I create a new one?",
    status: 'pending' as const,
    category: "Exam Question",
  },
  {
    query: "I'm registered for this course but can't access Canvas. My name doesn't appear on the roster. Can you help?",
    status: 'pending' as const,
    category: "Access Issue",
  },
  {
    query: "I submitted Assignment 2 on time but it shows as late in Gradescope. I have a timestamp screenshot showing it was submitted at 11:55 PM.",
    status: 'pending' as const,
    category: "Grade Dispute",
  },
  {
    query: "I need to withdraw from the course but it's past the withdrawal deadline. I'm dealing with personal circumstances. Is there anything I can do?",
    status: 'pending' as const,
    category: "Course Withdrawal",
  },
]

