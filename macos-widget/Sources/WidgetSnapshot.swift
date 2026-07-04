import Foundation

struct TodoWidgetSnapshot: Decodable {
    let version: Int
    let exportedAt: String
    let lastSyncedAt: String?
    let listName: String
    let tasks: [TodoWidgetTask]
}

struct TodoWidgetTask: Decodable, Identifiable {
    let id: String
    let title: String
    let importance: String?
    let dueDateTime: String?
    let reminderDateTime: String?
    let timeZone: String?
    let isReminderOn: Bool
    let dirty: Bool
}

extension TodoWidgetSnapshot {
    static let empty = TodoWidgetSnapshot(
        version: 1,
        exportedAt: "",
        lastSyncedAt: nil,
        listName: "Today",
        tasks: []
    )
}
