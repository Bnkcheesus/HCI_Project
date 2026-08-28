# Database and store procedure generator skill
Generate a realistic database and store procedure based on the given schema.
## Rules
- Data must be in Vietnamese or English
- The title can be in English but if there is a book translated into Vietnamese then prioritize Vietnamese. An exception for this is if the author is from a foreign country and the book is a research paper, please make sure the original book must be prioritized over the Vietnamese translated title
- The summary must be in Vietnamese
- Format for IDBorrowSlip must be PMXXXXXXXXXXXXXXXXX (len = 20)
- Format for IDMember must be RXXXXXXXXX (len = 10)
- Format for IDBook must be BXXXXXXXXXX (len = 12)
- With X being the string of numbers starting from 0000001 (automatically fill in the rest)