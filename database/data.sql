USE LibAssist;
GO

-- =============================================
-- Insert Data into BOOK Table (50 Books Total)
-- IDBook Format: BXXXXXXXXXX (len = 12)
-- =============================================

-- Category 1: 10 Famous Vietnamese Books (IDs B00000000001 - B00000000010)
INSERT INTO BOOK (IDBook, Title, Author, Summary, BookType, PublishYear, Quantity, Rating) VALUES
('B00000000001', N'Truyện Kiều', N'Nguyễn Du', N'Kiệt tác văn học cổ điển Việt Nam kể về cuộc đời chìm nổi của Thúy Kiều.', N'Văn học Việt Nam', 1820, 10, 4.9),
('B00000000002', N'Dế Mèn Phiêu Lưu Ký', N'Tô Hoài', N'Tác phẩm thiếu nhi kinh điển kể về những chuyến phiêu lưu đầy bài học của Dế Mèn.', N'Văn học Việt Nam', 1941, 8, 4.8),
('B00000000003', N'Tắt Đèn', N'Ngô Tất Tố', N'Bức tranh hiện thực phê phán phản ánh nỗi khổ cay đắng của nông dân Việt Nam trước cách mạng.', N'Văn học Việt Nam', 1939, 6, 4.6),
('B00000000004', N'Số Đỏ', N'Vũ Trọng Phụng', N'Tác phẩm trào phúng xuất sắc lên án sự lố lăng của xã hội thượng lưu thành thị thời Pháp thuộc.', N'Văn học Việt Nam', 1936, 5, 4.7),
('B00000000005', N'Nỗi Buồn Chiến Tranh', N'Bảo Ninh', N'Tiểu thuyết chiến tranh cảm động sâu sắc về góc nhìn thân phận con người sau cuộc chiến.', N'Văn học Việt Nam', 1990, 7, 4.8),
('B00000000006', N'Tuổi Trẻ Đáng Giá Bao Nhiêu?', N'Rosie Nguyễn', N'Cuốn sách truyền cảm hứng học tập, làm việc và sống hết mình cho thế hệ trẻ.', N'Văn học Việt Nam', 2016, 12, 4.5),
('B00000000007', N'Cho Tôi Xin Một Vé Đi Tuổi Thơ', N'Nguyễn Nhật Ánh', N'Tác phẩm trong trẻo đưa người đọc trở về thế giới tuổi thơ hồn nhiên và tràn ngập tiếng cười.', N'Văn học Việt Nam', 2008, 15, 4.9),
('B00000000008', N'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', N'Nguyễn Nhật Ánh', N'Câu chuyện cảm động về tình anh em, tình làng nghĩa xóm và tâm tư tuổi mới lớn ở làng quê.', N'Văn học Việt Nam', 2010, 10, 4.8),
('B00000000009', N'Vợ Nhặt', N'Kim Lân', N'Tác phẩm khắc họa tình người ấm áp và khát vọng sống mãnh liệt trong nạn đói năm 1945.', N'Văn học Việt Nam', 1962, 6, 4.7),
('B00000000010', N'Nhật Ký Trong Tù', N'Hồ Chí Minh', N'Tập thơ chữ Hán kiệt tác thể hiện chí khí cách mạng và tâm hồn nghệ sĩ của Bác Hồ.', N'Văn học Việt Nam', 1943, 8, 4.9);

-- Category 2: 10 Famous Foreign Literature / Books (IDs B00000000011 - B00000000020)
INSERT INTO BOOK (IDBook, Title, Author, Summary, BookType, PublishYear, Quantity, Rating) VALUES
('B00000000011', N'Đắc Nhân Tâm', N'Dale Carnegie', N'Cuốn sách nghệ thuật ứng xử và giao tiếp thu phục lòng người kinh điển thế giới.', N'Văn học nước ngoài', 1936, 15, 4.8),
('B00000000012', N'Nhà Giả Kim', N'Paulo Coelho', N'Hành trình theo đuổi ước mơ và vận mệnh của chàng chăn cừu Santiago.', N'Văn học nước ngoài', 1988, 14, 4.8),
('B00000000013', N'1984', N'George Orwell', N'Tiểu thuyết giả tưởng cảnh báo về chủ nghĩa toàn trị và kiểm soát tư tưởng.', N'Văn học nước ngoài', 1949, 7, 4.7),
('B00000000014', N'Giết Con Chim Nhại', N'Harper Lee', N'Câu chuyện về công lý, sự phân biệt chủng tộc và lòng tốt tại miền Nam nước Mỹ.', N'Văn học nước ngoài', 1960, 8, 4.9),
('B00000000015', N'Ông Già Và Biển Cả', N'Ernest Hemingway', N'Biểu tượng về nghị lực kiên cường của con người trước thiên nhiên dữ dội.', N'Văn học nước ngoài', 1952, 6, 4.6),
('B00000000016', N'Tội Lỗi Và Hình Phạt', N'Fyodor Dostoevsky', N'Kiệt tác tâm lý khắc họa cuộc đấu tranh nội tâm gay gắt giữa cái thiện và cái ác.', N'Văn học nước ngoài', 1866, 5, 4.8),
('B00000000017', N'Rừng Na Uy', N'Haruki Murakami', N'Tiểu thuyết lãng mạn hoài niệm về tình yêu, sự mất mát và cô đơn của tuổi trẻ.', N'Văn học nước ngoài', 1987, 9, 4.4),
('B00000000018', N'Hoàng Tử Bé', N'Antoine de Saint-Exupéry', N'Câu chuyện triết lý sâu sắc về tình bạn, tình yêu và ý nghĩa cuộc sống qua góc nhìn trẻ thơ.', N'Văn học nước ngoài', 1943, 12, 4.9),
('B00000000019', N'Số Phận Con Người', N'Mikhail Sholokhov', N'Truyện ngắn kiệt tác về tinh thần quả cảm và nhân văn của người lính Xô Viết.', N'Văn học nước ngoài', 1956, 4, 4.6),
('B00000000020', N'Trăm Năm Cô Đơn', N'Gabriel García Márquez', N'Kiệt tác chủ nghĩa thực tại huyền ảo kể về dòng họ Buendía tại làng Macondo.', N'Văn học nước ngoài', 1967, 6, 4.7);

-- Category 3: 10 Scientific & Computer Science Textbooks (IDs B00000000021 - B00000000030)
INSERT INTO BOOK (IDBook, Title, Author, Summary, BookType, PublishYear, Quantity, Rating) VALUES
('B00000000021', N'Giải Thuật Và Lập Trình', N'Lê Minh Hoàng', N'Sách giáo trình kinh điển về cấu trúc dữ liệu và giải thuật nâng cao cho sinh viên CNTT Việt Nam.', N'Công nghệ thông tin', 2002, 10, 4.9),
('B00000000022', N'Cấu Trúc Dữ Liệu Và Giải Thuật', N'Trần Hạnh', N'Tài liệu giảng dạy nền tảng về các kiểu dữ liệu, danh sách, cây, đồ thị và thuật toán sắp xếp.', N'Công nghệ thông tin', 2015, 8, 4.5),
('B00000000023', N'Clean Code: A Handbook of Agile Software Craftsmanship', N'Robert C. Martin', N'Quy chuẩn và kỹ năng viết mã nguồn sạch, dễ đọc và bảo trì dành cho lập trình viên.', N'Công nghệ thông tin', 2008, 9, 4.8),
('B00000000024', N'Giáo Trình Hệ Điều Hành', N'Hà Quang Thụy', N'Kiến thức toàn diện về quản lý tiến trình, bộ nhớ, hệ thống tệp và bảo mật hệ điều hành.', N'Công nghệ thông tin', 2018, 6, 4.4),
('B00000000025', N'Giáo Trình Cơ Sở Dữ Liệu', N'Đỗ Trung Tuấn', N'Trình bày mô hình ER, đại số quan hệ, SQL và tối ưu hóa truy vấn cơ sở dữ liệu quan hệ.', N'Công nghệ thông tin', 2016, 7, 4.5),
('B00000000026', N'Design Patterns: Elements of Reusable Object-Oriented Software', N'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', N'Các mẫu thiết kế phần mềm hướng đối tượng chuẩn hóa giúp giải quyết các bài toán thiết kế phổ biến.', N'Công nghệ thông tin', 1994, 5, 4.7),
('B00000000027', N'Nhập Môn Trí Tuệ Nhân Tạo', N'Đinh Bá Tiến', N'Tổng quan về học máy, mạng thần kinh nhân tạo, giải thuật tìm kiếm và học sâu.', N'Công nghệ thông tin', 2021, 6, 4.6),
('B00000000028', N'Computer Networks', N'Andrew S. Tanenbaum', N'Giáo trình tiêu chuẩn về các tầng mạng, giao thức TCP/IP và an toàn thông tin.', N'Công nghệ thông tin', 2011, 8, 4.7),
('B00000000029', N'Kỹ Thuật Lập Trình Hướng Đối Tượng C++', N'Phạm Văn Ất', N'Hướng dẫn chi tiết khái niệm lớp, đối tượng, kế thừa, đa hình và ứng dụng trong C++.', N'Công nghệ thông tin', 2014, 10, 4.5),
('B00000000030', N'Kiến Trúc Máy Tính Và Hợp Ngữ', N'Bùi Tuyết Trinh', N'Phân tích tổ chức bộ vi xử lý, bộ nhớ cache, tập lệnh RISC/CISC và lập trình Assembly.', N'Công nghệ thông tin', 2019, 5, 4.3);

-- Category 4: 20 Academic Research Books & Papers on Language and Mathematics (IDs B00000000031 - B00000000050)
-- (Foreign research papers/books prioritize original English titles per skill.md rule)
INSERT INTO BOOK (IDBook, Title, Author, Summary, BookType, PublishYear, Quantity, Rating) VALUES
('B00000000031', N'Cơ Sở Ngôn Ngữ Học Và Tiếng Việt', N'Mai Ngọc Chừ', N'Nghiên cứu khoa học về lý luận ngôn ngữ học đại cương và đặc điểm ngữ âm, ngữ pháp tiếng Việt.', N'Ngôn ngữ học', 2010, 5, 4.6),
('B00000000032', N'Ngữ Pháp Tiếng Việt Hiện Đại', N'Nguyễn Tài Cẩn', N'Công trình nghiên cứu sâu sắc về từ loại, cấu trúc cú pháp và cú pháp học tiếng Việt.', N'Ngôn ngữ học', 2004, 4, 4.7),
('B00000000033', N'Nghiên Cứu Ngữ Âm Học Tiếng Việt', N'Đoàn Thiện Thuật', N'Tài liệu chuyên khảo về hệ thống âm tiết, thanh điệu và biến âm trong tiếng Việt.', N'Ngôn ngữ học', 1999, 3, 4.5),
('B00000000034', N'Ngôn Ngữ Học Đối Chiếu', N'Bùi Mạnh Hùng', N'Chuyên khảo so sánh cấu trúc ngôn ngữ tiếng Việt với tiếng Anh và các ngôn ngữ phương Tây.', N'Ngôn ngữ học', 2008, 4, 4.4),
('B00000000035', N'Từ Vựng Học Tiếng Việt', N'Nguyễn Thiện Giáp', N'Nghiên cứu hệ thống từ vựng, ngữ nghĩa học và phương thức cấu tạo từ trong tiếng Việt.', N'Ngôn ngữ học', 2012, 5, 4.6),
('B00000000036', N'Ngôn Ngữ Học Xã Hội', N'Trần Trí Dõi', N'Khảo sát sự tương tác giữa ngôn ngữ và các nhân tố xã hội, biến thể địa phương.', N'Ngôn ngữ học', 2015, 3, 4.3),
('B00000000037', N'Ngữ Nghĩa Học Tiếng Việt', N'Đỗ Hữu Châu', N'Công trình khoa học phân tích ý nghĩa từ ngữ, câu và ngữ cảnh giao tiếp.', N'Ngôn ngữ học', 2001, 4, 4.7),
('B00000000038', N'Course in General Linguistics', N'Ferdinand de Saussure', N'Chuyên khảo kinh điển đặt nền móng cho ngôn ngữ học hiện đại và phân tích tín hiệu.', N'Ngôn ngữ học', 1916, 2, 4.8),
('B00000000039', N'Syntactic Structures', N'Noam Chomsky', N'Nghiên cứu về ngữ pháp cải biến - tạo sinh và năng lực ngôn ngữ bẩm sinh.', N'Ngôn ngữ học', 1957, 3, 4.9),
('B00000000040', N'Foundations of Statistical Natural Language Processing', N'Christopher D. Manning, Hinrich Schütze', N'Nghiên cứu học máy áp dụng vào phân tích cú pháp, dịch máy và khai phá văn bản.', N'Ngôn ngữ học', 1999, 4, 4.8),
('B00000000041', N'Giải Tích Toán Học Tập 1', N'Nguyễn Đình Trí', N'Giáo trình nghiên cứu dãy số, giới hạn, đạo hàm và tích phân hàm một biến.', N'Toán học', 2017, 8, 4.6),
('B00000000042', N'Đại Số Tuyến Tính Và Hình Học Analytic', N'Lê Tuấn Hoa', N'Chuyên khảo toán học về không gian vectơ, ma trận, định thức và phép biến đổi tuyến tính.', N'Toán học', 2015, 7, 4.7),
('B00000000043', N'Xác Suất Thống Kê Toán Học', N'Đào Hữu Hồ', N'Nghiên cứu biến ngẫu nhiên, quy luật phân phối và ước lượng tham số thống kê.', N'Toán học', 2014, 6, 4.5),
('B00000000044', N'Phương Trình Vi Phân Và Ứng Dụng', N'Nguyễn Thế Hoàn', N'Chuyên khảo toán ứng dụng nghiên cứu phương trình vi phân thường và cấp cao.', N'Toán học', 2011, 4, 4.4),
('B00000000045', N'Lý Thuyết Số Và Mã Hóa Thông Tin', N'Hà Huy Khoái', N'Nghiên cứu tính chất số nguyên, đồng dư thức và ứng dụng trong mật mã học.', N'Toán học', 2013, 5, 4.8),
('B00000000046', N'Toán Rời Rạc Và Lý Thuyết Đồ Thị', N'Nguyễn Đức Nghĩa', N'Công trình nghiên cứu lý thuyết tập hợp, logic toán, đồ thị và bài toán tối ưu rời rạc.', N'Toán học', 2010, 6, 4.6),
('B00000000047', N'Giải Tích Phức Và Ứng Dụng', N'Đậu Thế Cấp', N'Nghiên cứu hàm biến phức, chuỗi Taylor/Laurent và tích phân Cauchy.', N'Toán học', 2016, 3, 4.3),
('B00000000048', N'Tối Ưu Hóa Tuyến Tính Và Phi Tuyến', N'Phan Quốc Khánh', N'Chuyên khảo toán học cao cấp nghiên cứu quy hoạch tuyến tính và điều kiện KKT.', N'Toán học', 2009, 3, 4.5),
('B00000000049', N'Nghiên Cứu Hình Học Vi Phân', N'Đoàn Quỳnh', N'Tài liệu nghiên cứu đường, mặt trong không gian Euclidean và đa diện Riemannian.', N'Toán học', 2007, 2, 4.4),
('B00000000050', N'Lý Thuyết Độ Đo Và Tích Phân Lebesgue', N'Nguyễn Xuân Liêm', N'Nghiên cứu không dịch độ đo, hàm đo được và tích phân Lebesgue trong không gian Banach.', N'Toán học', 2006, 3, 4.7);

-- =============================================
-- Insert Data into MEMBER Table (20 Members)
-- IDMember Format: RXXXXXXXXX (len = 10)
-- =============================================
INSERT INTO MEMBER (IDMember, Name, Email, PhoneNumber, Password) VALUES
('R000000001', N'Nguyễn Văn An', 'nguyenvanan@gmail.com', '0901234567', 'password123'),
('R000000002', N'Trần Thị Bình', 'tranthibinh@gmail.com', '0912345678', 'securepass456'),
('R000000003', N'Lê Văn Cường', 'levancuong@gmail.com', '0923456789', 'mypassword789'),
('R000000004', N'Phạm Minh Dung', 'phamminhdung@gmail.com', '0934567890', 'passd12345'),
('R000000005', N'Hoàng Anh Dũng', 'hoanganhdung@gmail.com', '0945678901', 'epassword2026'),
('R000000006', N'Vũ Thị Giang', 'vuthigiang@gmail.com', '0956789012', 'giangpass12'),
('R000000007', N'Đặng Văn Hải', 'dangvanhai@gmail.com', '0967890123', 'haipassword'),
('R000000008', N'Bùi Thị Hoa', 'buithihoa@gmail.com', '0978901234', 'hoapass2026'),
('R000000009', N'Đỗ Minh Khoa', 'dominhkhoa@gmail.com', '0989012345', 'khoapassword'),
('R000000010', N'Ngô Thanh Lan', 'ngothanhlan@gmail.com', '0990123456', 'lanpass1234'),
('R000000011', N'Dương Quốc Mai', 'duongquocmai@gmail.com', '0909876543', 'maipassword'),
('R000000012', N'Lý Văn Nam', 'lyvannam@gmail.com', '0918765432', 'nampass123'),
('R000000013', N'Phan Thị Phương', 'phanthiphuong@gmail.com', '0927654321', 'phuongpass'),
('R000000014', N'Trịnh Minh Quân', 'trinhminhquan@gmail.com', '0936543210', 'quanpass2026'),
('R000000015', N'Mai Văn Sơn', 'maivanson@gmail.com', '0945432109', 'sonpass123'),
('R000000016', N'Đinh Thị Trang', 'dinhthitrang@gmail.com', '0954321098', 'trangpass456'),
('R000000017', N'Lâm Văn Tuấn', 'lamvantuan@gmail.com', '0963210987', 'tuanpassword'),
('R000000018', N'Võ Hoàng Uyên', 'vohoanguyen@gmail.com', '0972109876', 'uyenpass2026'),
('R000000019', N'Cao Minh Việt', 'caominhviet@gmail.com', '0981098765', 'vietpass123'),
('R000000020', N'Hà Thị Yến', 'hathiyen@gmail.com', '0990987654', 'yenpass789');

-- =============================================
-- Insert Data into BORROW_SLIP Table (25 Slips)
-- IDBorrowSlip Format: PMXXXXXXXXXXXXXXXXX (len = 20)
-- =============================================
INSERT INTO BORROW_SLIP (IDBorrowSlip, IDMember, IDBook, BorrowDate, ReturnDate, Status) VALUES
('PM000000000000000001', 'R000000001', 'B00000000001', '2026-01-10', '2026-01-24', N'Đã trả'),
('PM000000000000000002', 'R000000001', 'B00000000021', '2026-02-01', '2026-02-15', N'Đang mượn'),
('PM000000000000000003', 'R000000002', 'B00000000011', '2026-01-15', '2026-01-29', N'Đã trả'),
('PM000000000000000004', 'R000000002', 'B00000000023', '2026-02-05', '2026-02-19', N'Đang mượn'),
('PM000000000000000005', 'R000000003', 'B00000000007', '2026-01-20', '2026-02-03', N'Trả muộn'),
('PM000000000000000006', 'R000000003', 'B00000000041', '2026-02-10', '2026-02-24', N'Đang mượn'),
('PM000000000000000007', 'R000000004', 'B00000000014', '2026-02-12', '2026-02-26', N'Đang mượn'),
('PM000000000000000008', 'R000000005', 'B00000000031', '2026-01-25', '2026-02-08', N'Đã trả'),
('PM000000000000000009', 'R000000006', 'B00000000005', '2026-02-15', '2026-03-01', N'Đang mượn'),
('PM000000000000000010', 'R000000007', 'B00000000026', '2026-01-05', '2026-01-19', N'Trả muộn'),
('PM000000000000000011', 'R000000008', 'B00000000012', '2026-02-18', '2026-03-04', N'Đang mượn'),
('PM000000000000000012', 'R000000009', 'B00000000038', '2026-02-20', '2026-03-06', N'Đang mượn'),
('PM000000000000000013', 'R000000010', 'B00000000045', '2026-02-22', '2026-03-08', N'Đang mượn'),
('PM000000000000000014', 'R000000004', 'B00000000002', '2026-01-18', '2026-02-01', N'Đã trả'),
('PM000000000000000015', 'R000000005', 'B00000000050', '2026-02-24', '2026-03-10', N'Đang mượn'),
('PM000000000000000016', 'R000000011', 'B00000000028', '2026-02-11', '2026-02-25', N'Đang mượn'),
('PM000000000000000017', 'R000000012', 'B00000000039', '2026-01-12', '2026-01-26', N'Đã trả'),
('PM000000000000000018', 'R000000013', 'B00000000018', '2026-02-14', '2026-02-28', N'Đang mượn'),
('PM000000000000000019', 'R000000014', 'B00000000022', '2026-01-30', '2026-02-13', N'Trả muộn'),
('PM000000000000000020', 'R000000015', 'B00000000040', '2026-02-16', '2026-03-02', N'Đang mượn'),
('PM000000000000000021', 'R000000016', 'B00000000003', '2026-02-02', '2026-02-16', N'Đã trả'),
('PM000000000000000022', 'R000000017', 'B00000000042', '2026-02-17', '2026-03-03', N'Đang mượn'),
('PM000000000000000023', 'R000000018', 'B00000000016', '2026-02-19', '2026-03-05', N'Đang mượn'),
('PM000000000000000024', 'R000000019', 'B00000000027', '2026-01-22', '2026-02-05', N'Trả muộn'),
('PM000000000000000025', 'R000000020', 'B00000000035', '2026-02-21', '2026-03-07', N'Đang mượn');
GO