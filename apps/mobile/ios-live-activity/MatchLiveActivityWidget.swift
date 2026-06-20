//
//  MatchLiveActivityWidget.swift
//  MatchOra — Live Activity + Dynamic Island UI (WidgetKit / ActivityKit)
//
//  SCAFFOLD ONLY — see ./README.md and docs/IOS_LIVE_ACTIVITIES.md.
//  This belongs to a Widget Extension target (not the main app target).
//

import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.1, *)
struct MatchLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MatchActivityAttributes.self) { context in
            // Lock Screen / banner presentation.
            LockScreenView(
                attributes: context.attributes,
                state: context.state
            )
            .activityBackgroundTint(Color.black.opacity(0.85))
            .activitySystemActionForegroundColor(Color(red: 0.13, green: 0.89, blue: 0.64)) // brand mint
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.homeCode).font(.headline)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.awayCode).font(.headline)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("\(context.state.homeScore) : \(context.state.awayScore)")
                        .font(.title2).bold().monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(statusLine(context.state))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Text(context.attributes.homeCode).font(.caption2)
            } compactTrailing: {
                Text("\(context.state.homeScore)-\(context.state.awayScore)")
                    .font(.caption2).monospacedDigit()
            } minimal: {
                Text("\(context.state.homeScore)-\(context.state.awayScore)")
                    .font(.caption2).monospacedDigit()
            }
            .keylineTint(Color(red: 0.13, green: 0.89, blue: 0.64))
        }
    }
}

@available(iOS 16.1, *)
private struct LockScreenView: View {
    let attributes: MatchActivityAttributes
    let state: MatchActivityAttributes.ContentState

    var body: some View {
        HStack {
            Text(attributes.homeCode).font(.headline)
            Spacer()
            VStack {
                Text("\(state.homeScore) : \(state.awayScore)")
                    .font(.title).bold().monospacedDigit()
                Text(statusLine(state)).font(.caption2).foregroundStyle(.secondary)
            }
            Spacer()
            Text(attributes.awayCode).font(.headline)
        }
        .padding()
    }
}

@available(iOS 16.1, *)
private func statusLine(_ state: MatchActivityAttributes.ContentState) -> String {
    switch state.status {
    case "live", "extra_time":
        if let m = state.minute { return "LIVE  \(m)'" }
        return "LIVE"
    case "halftime": return "Half-time"
    case "penalties":
        let h = state.homePenalties ?? 0
        let a = state.awayPenalties ?? 0
        return "Penalties \(h)-\(a)"
    case "finished": return "Full-time"
    default: return state.status.capitalized
    }
}
