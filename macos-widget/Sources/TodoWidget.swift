import SwiftUI
import WidgetKit

struct TodoWidgetEntry: TimelineEntry {
    let date: Date
    let snapshot: TodoWidgetSnapshot
}

struct TodoWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodoWidgetEntry {
        TodoWidgetEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodoWidgetEntry) -> Void) {
        completion(TodoWidgetEntry(date: Date(), snapshot: SnapshotStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodoWidgetEntry>) -> Void) {
        let entry = TodoWidgetEntry(date: Date(), snapshot: SnapshotStore.load())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct TodoWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodoWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            header

            if visibleTasks.isEmpty {
                emptyState
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(visibleTasks) { task in
                        TodoWidgetTaskRow(task: task)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(WidgetConfig.appOpenURL)
    }

    private var header: some View {
        HStack(spacing: 6) {
            Text(entry.snapshot.listName)
                .font(.headline)
                .lineLimit(1)
            Spacer(minLength: 4)
            if let lastSyncedAt = formattedLastSyncedAt {
                Text(lastSyncedAt)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    private var emptyState: some View {
        Text("No open tasks")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var visibleTasks: [TodoWidgetTask] {
        Array(entry.snapshot.tasks.prefix(maxTaskCount))
    }

    private var maxTaskCount: Int {
        switch family {
        case .systemSmall:
            return 3
        case .systemMedium:
            return 5
        default:
            return 8
        }
    }

    private var formattedLastSyncedAt: String? {
        guard let raw = entry.snapshot.lastSyncedAt,
              let date = ISO8601DateFormatter.widgetDate(from: raw)
        else {
            return nil
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct TodoWidgetTaskRow: View {
    let task: TodoWidgetTask

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
            Circle()
                .strokeBorder(task.importance == "high" ? Color.red : Color.secondary, lineWidth: 1.4)
                .frame(width: 11, height: 11)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.subheadline)
                    .fontWeight(task.importance == "high" ? .semibold : .regular)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let due = formattedDueDate {
                        Label(due, systemImage: "calendar")
                    }
                    if task.isReminderOn {
                        Image(systemName: "bell")
                    }
                    if task.dirty {
                        Text("local")
                    }
                }
                .font(.caption2)
                .foregroundStyle(isOverdue ? .red : .secondary)
                .lineLimit(1)
            }
        }
    }

    private var formattedDueDate: String? {
        guard let date = task.dueDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    private var isOverdue: Bool {
        guard let date = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: date) <= Calendar.current.startOfDay(for: Date())
    }
}

struct TodoWidget: Widget {
    let kind = "TodoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodoWidgetProvider()) { entry in
            TodoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Microsoft To Do")
        .description("Shows your current Today tasks.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct TodoWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodoWidget()
    }
}

private extension TodoWidgetTask {
    var dueDate: Date? {
        guard let raw = dueDateTime else { return nil }
        let key = String(raw.prefix(10))
        return DateFormatter.widgetDateOnly.date(from: key)
    }
}

private extension ISO8601DateFormatter {
    static func widgetDate(from raw: String) -> Date? {
        widgetFormatterWithFractionalSeconds.date(from: raw) ?? widgetFormatter.date(from: raw)
    }

    static let widgetFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let widgetFormatterWithFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

private extension DateFormatter {
    static let widgetDateOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}
