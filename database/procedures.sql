USE LibAssist;
GO

-- =============================================
-- Stored Procedure: sp_AddBorrowSlip
-- Purpose: Creates a new borrow slip with auto-generated IDBorrowSlip
-- Format: PMXXXXXXXXXXXXXXXXX (Length = 20)
-- Validates member & book existence, checks stock, and updates book quantity.
-- =============================================

CREATE OR ALTER PROCEDURE sp_AddBorrowSlip
    @IDMember VARCHAR(10),
    @IDBook VARCHAR(12),
    @BorrowDate DATE = NULL,
    @ReturnDate DATE = NULL,
    @NewIDBorrowSlip VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Check if Member exists
    IF NOT EXISTS (SELECT * FROM MEMBER WHERE IDMember = @IDMember)
    BEGIN
        RAISERROR(N'Lỗi: Thành viên không tồn tại (IDMember: %s).', 16, 1, @IDMember);
        RETURN;
    END

    -- 2. Check if Book exists
    IF NOT EXISTS (SELECT * FROM BOOK WHERE IDBook = @IDBook)
    BEGIN
        RAISERROR(N'Lỗi: Sách không tồn tại (IDBook: %s).', 16, 1, @IDBook);
        RETURN;
    END

    -- 3. Check Book Quantity in stock
    DECLARE @AvailableQuantity INT;
    SELECT @AvailableQuantity = Quantity FROM BOOK WHERE IDBook = @IDBook;

    IF @AvailableQuantity <= 0
    BEGIN
        RAISERROR(N'Lỗi: Sách này đã hết trong kho (Quantity = 0).', 16, 1);
        RETURN;
    END

    -- 4. Set Default BorrowDate (Today) and ReturnDate (+14 Days) if not provided
    IF @BorrowDate IS NULL
        SET @BorrowDate = CAST(GETDATE() AS DATE);

    IF @ReturnDate IS NULL
        SET @ReturnDate = DATEADD(DAY, 14, @BorrowDate);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 5. Auto-generate IDBorrowSlip: Format PMXXXXXXXXXXXXXXXXX (len = 20)
        DECLARE @MaxNum BIGINT;
        SELECT @MaxNum = ISNULL(MAX(CAST(RIGHT(IDBorrowSlip, 18) AS BIGINT)), 0)
        FROM BORROW_SLIP
        WHERE IDBorrowSlip LIKE 'PM%';

        DECLARE @NextNum BIGINT = @MaxNum + 1;
        SET @NewIDBorrowSlip = 'PM' + RIGHT('000000000000000000' + CAST(@NextNum AS VARCHAR(18)), 18);

        -- 6. Insert new record into BORROW_SLIP
        INSERT INTO BORROW_SLIP (IDBorrowSlip, IDMember, IDBook, BorrowDate, ReturnDate, Status)
        VALUES (@NewIDBorrowSlip, @IDMember, @IDBook, @BorrowDate, @ReturnDate, N'Đang mượn');

        -- 7. Deduct 1 from Book Quantity
        UPDATE BOOK
        SET Quantity = Quantity - 1
        WHERE IDBook = @IDBook;

        COMMIT TRANSACTION;

        PRINT N'Tạo phiếu mượn thành công. Mã phiếu mượn: ' + @NewIDBorrowSlip;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- =============================================
-- Stored Procedure: sp_ReturnBook
-- Purpose: Processes returning a borrowed book by IDBorrowSlip.
-- Updates status to N'Đã trả' or N'Trả muộn' and increases book quantity.
-- =============================================

CREATE OR ALTER PROCEDURE sp_ReturnBook
    @IDBorrowSlip VARCHAR(20),
    @ActualReturnDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Check if Borrow Slip exists
    IF NOT EXISTS (SELECT * FROM BORROW_SLIP WHERE IDBorrowSlip = @IDBorrowSlip)
    BEGIN
        RAISERROR(N'Lỗi: Phiếu mượn không tồn tại (IDBorrowSlip: %s).', 16, 1, @IDBorrowSlip);
        RETURN;
    END

    DECLARE @CurrentStatus NVARCHAR(20);
    DECLARE @ExpectedReturnDate DATE;
    DECLARE @IDBook VARCHAR(12);

    SELECT @CurrentStatus = Status, @ExpectedReturnDate = ReturnDate, @IDBook = IDBook
    FROM BORROW_SLIP
    WHERE IDBorrowSlip = @IDBorrowSlip;

    -- 2. Check if already returned
    IF @CurrentStatus = N'Đã trả'
    BEGIN
        RAISERROR(N'Lỗi: Phiếu mượn này đã được trả trước đó.', 16, 1);
        RETURN;
    END

    IF @ActualReturnDate IS NULL
        SET @ActualReturnDate = CAST(GETDATE() AS DATE);

    -- 3. Determine status based on actual return date vs expected return date
    DECLARE @NewStatus NVARCHAR(20);
    IF @ActualReturnDate > @ExpectedReturnDate
        SET @NewStatus = N'Trả muộn';
    ELSE
        SET @NewStatus = N'Đã trả';

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 4. Update BORROW_SLIP
        UPDATE BORROW_SLIP
        SET Status = @NewStatus,
            ReturnDate = @ActualReturnDate
        WHERE IDBorrowSlip = @IDBorrowSlip;

        -- 5. Increase Book Quantity
        UPDATE BOOK
        SET Quantity = Quantity + 1
        WHERE IDBook = @IDBook;

        COMMIT TRANSACTION;

        PRINT N'Trả sách thành công. Trạng thái phiếu mượn: ' + @NewStatus;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END;
GO
