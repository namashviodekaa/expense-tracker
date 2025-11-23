Smart Expense & Budget Tracker (INR)

Overview of the Project
The Smart Expense & Budget Tracker is a single-page, responsive web application designed to help users monitor and manage their personal finances in real-time. It provides a clean, intuitive interface for logging daily expenditures, setting monthly budgets, and viewing analytical summaries of spending trends using Indian Rupees (INR). The application stores all data locally in the browser, providing a fast and private financial tracking experience. It will prove to be quite helpful with college students who just keep on spending ransom amounts without thinking twice.




FEATURES
•	Daily Expense Logging: Record an expense. Daily Expense Logging asks for the amount, in ₹ the category, the description and the date. 

•	Real-time Totals: Real-time Totals show the amount spent for the day right away. 


•	Weekly Summary: I compare the spending of the week with the spending of the week. I do this for performance checks. 

•	Monthly Report & Trend Chart: Monthly Report & Trend Chart shows the spending, for the month. Monthly Report & Trend Chart also shows the spending trends, for the twelve months.


•	Budget & Goals Management: I set a budget goal. I track the budget goal against my spending. I use a progress bar to see the progress. I get status updates, on the budget goal.
 
•	Insights: The Insights Engine gives you feedback. The Insights Engine sends alerts when you go over budget. The Insights Engine shows you savings compared to periods. The Insights Engine identifies the spending category. CRUD Operations: Full functionality to Create, Read, Update, and Delete individual expense entries. 


•	Mobile-First Design: Fully responsive layout with a sticky bottom navigation bar for excellent mobile usability.
TECHNOLOGIES AND TOOLS USED
This project utilizes a modern, minimalist stack to ensure fast performance and easy deployment.
              HTML5
	Core structure of the application.



          Vanilla JavaScript	
	
	
	
	All application logic, state management, and DOM manipulation.
Tailwind CSS	Utility-first framework for responsive, aesthetic styling (using the CDN).

Local Storage API
	Persistent data storage for expenses and budgets within the user's browser.

Inter Font	Clean, modern typography for enhanced readability.
	






STEPS TO INSTALL AND RUN THE PROJECT
Since this is a single, self-contained HTML file with embedded CSS and JavaScript, there are no complex installation steps or dependencies required.
1.	Save the File: Save the entire code block provided (or the file named index.html) to your local computer.
2.	Open in Browser: Locate the saved file (index.html) and double-click it.
3.	Start Tracking: The application will open immediately in your default web browser (Chrome, Firefox, Edge, etc.).
Note: If you are using the Canvas environment (where this file was generated), simply clicking the Preview button will run the application instantly.









INSTRUCTIONS FOR TESTING
1. Test Daily Expense Logging (CRUD)
    1.	Navigate to the Daily Expenses view.
    2.	Use the "Add New Expense" form:
      o	Enter an Amount (e.g., 120.50).
      o	Select a Category (e.g., Food).
      o	Enter a Description (e.g., Dinner with friends).
      o	Click Record Expense.
    3.	Verify the new expense appears in the Recent Entries list and the Today's Total is updated.
    4.	Test the Edit button on the new entry: change the amount or description and click Save Changes.
    5.	Test the Delete button: confirm the deletion via the modal pop-up and verify the entry is removed.
2. Test Budget Setting
    1.	Navigate to the Budget & Goals view.
    2.	Use the "Set Monthly Budget Goal" form.
    3.	Enter a budget Amount (e.g., 15000).
    4.	Click Save Budget.
    5.	Verify the budget status card updates, showing the total budget, amount spent, and percentage used, and confirm the status is "ON TRACK" if spending is low.

3. Test Reporting & Insights
    1.	Navigate to the Weekly Summary view.
    2.	Verify the total spending for the Current Week and Last Week is displayed.
    3.	Check the Category Distribution to see where the bulk of the spending occurred.
    4.	Navigate to the Insights & Review view.
    5.	Confirm that the Personalized Insights section provides feedback based on your budget status (Step 2) and your spending habits (Step 1). For example, it should show an 'Excellent' or 'Caution' message             regarding your budget.
