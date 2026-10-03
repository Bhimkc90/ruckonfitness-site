import PDFKit
let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
var out = ""
for i in 0..<doc.pageCount { out += "=== PAGE \(i + 1)\n" + (doc.page(at: i)?.string ?? "") + "\n" }
try! out.write(toFile: CommandLine.arguments[2], atomically: true, encoding: .utf8)
print("pages", doc.pageCount)
