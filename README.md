# Daily-Productivity-Log
CSCI 5300 Software Engineering Semester Long Project. A Google Chrome extension that tracks the user's browsing history throughout the day, emailing  them the following morning their activity from the day before, as well as tips on how they can improve upon their productivity.

## Recommendation System (SCRUM-11)

This module is responsible for generating productivity recommendations based on user browsing behavior.

### Design Approach
In Sprint 1, the system is designed using a rule-based approach. Instead of implementing complex models, simple logical rules are defined to evaluate user activity.

The system takes summarized browsing data as input, including:
- Time spent on productive websites
- Time spent on unproductive websites
- Time spent on neutral websites

### Example Rules
Some initial rules include:
- If time spent on unproductive websites is high, suggest reducing distractions.
- If productive time is higher than unproductive time, provide positive feedback.
- If productive time is low, encourage more focus on productive tasks.

### Output
The system will generate a list of recommendations, which can later be displayed in the extension UI or included in a daily email summary.

### Future Work
In Sprint 2, this module will be extended to:
- Implement the recommendation engine logic in code
- Integrate with categorized browsing data
- Format output for UI and email delivery