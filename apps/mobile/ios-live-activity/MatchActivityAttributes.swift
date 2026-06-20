//
//  MatchActivityAttributes.swift
//  MatchOra — iOS Live Activity (ActivityKit)
//
//  SCAFFOLD ONLY. This file is NOT compiled by Expo Go and is NOT built in this
//  environment. It requires an EAS development build (expo prebuild) + Xcode +
//  a real Apple Developer account with the Live Activities capability.
//  See docs/IOS_LIVE_ACTIVITIES.md and ./README.md for wiring instructions.
//
//  The ContentState mirrors src/lib/liveActivity.ts ActivityContentState and the
//  shared FixtureSnapshot in @matchora/shared.
//

import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct MatchActivityAttributes: ActivityAttributes {
    public typealias ContentState = MatchContentState

    /// Static attributes — set once when the activity starts.
    public let fixtureId: String
    public let homeCode: String   // e.g. "BRA"
    public let awayCode: String   // e.g. "ARG"

    public init(fixtureId: String, homeCode: String, awayCode: String) {
        self.fixtureId = fixtureId
        self.homeCode = homeCode
        self.awayCode = awayCode
    }

    /// Dynamic content — updated locally or via APNs Live Activity push tokens.
    public struct MatchContentState: Codable, Hashable {
        public var homeScore: Int
        public var awayScore: Int
        public var minute: Int?
        /// Matches @matchora/shared FixtureStatus string union.
        public var status: String
        public var homePenalties: Int?
        public var awayPenalties: Int?

        public init(
            homeScore: Int,
            awayScore: Int,
            minute: Int?,
            status: String,
            homePenalties: Int? = nil,
            awayPenalties: Int? = nil
        ) {
            self.homeScore = homeScore
            self.awayScore = awayScore
            self.minute = minute
            self.status = status
            self.homePenalties = homePenalties
            self.awayPenalties = awayPenalties
        }
    }
}
