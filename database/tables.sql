CREATE DATABASE LibAssist
GO
USE LibAssist 
GO
CREATE TABLE BOOK (
    IDBook VARCHAR(12),
    Title NVARCHAR(100),
    Author NVARCHAR(100),
    Summary NVARCHAR(1000),
    BookType NVARCHAR(100),
    PublishYear INT, 
    Quantity INT,
    Rating DECIMAL (2,1),
    PRIMARY KEY (IDBook)
)

CREATE TABLE MEMBER (
    IDMember VARCHAR(10),
    Name NVARCHAR(100),
    Email VARCHAR(100),
    PhoneNumber VARCHAR(15),
    Password VARCHAR(100),
    PRIMARY KEY (IDMember)
)

CREATE TABLE BORROW_SLIP (
    IDBorrowSlip VARCHAR(20),
    IDMember VARCHAR(10),
    IDBook VARCHAR(12),
    BorrowDate DATE,
    ReturnDate DATE,
    Status NVARCHAR(20) CHECK (Status IN (N'Đã trả', N'Trả muộn', N'Đang mượn')) DEFAULT N'Đang mượn',
    PRIMARY KEY (IDBorrowSlip),
    FOREIGN KEY (IDMember) REFERENCES MEMBER(IDMember),
    FOREIGN KEY (IDBook) REFERENCES BOOK(IDBook)
)