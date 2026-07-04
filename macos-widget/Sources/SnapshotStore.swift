import Foundation

enum SnapshotStore {
    static func load() -> TodoWidgetSnapshot {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: WidgetConfig.appGroupId
        ) else {
            return .empty
        }

        let snapshotURL = containerURL.appendingPathComponent(WidgetConfig.snapshotFileName)
        guard let data = try? Data(contentsOf: snapshotURL) else {
            return .empty
        }

        return (try? JSONDecoder().decode(TodoWidgetSnapshot.self, from: data)) ?? .empty
    }
}
