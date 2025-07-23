import { User, Group } from '@/types';

export interface MatchingCriteria {
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredGroupSize: number;
  timeZone?: string;
  availableHours?: string[];
}

export interface MatchScore {
  userId: string;
  score: number;
  factors: {
    goalAlignment: number;
    experienceMatch: number;
    personalityFit: number;
    scheduleCompatibility: number;
  };
}

export class PeerMatchingService {
  static calculateMatchScore(user1: User, user2: User): MatchScore {
    const factors = {
      goalAlignment: this.calculateGoalAlignment(user1, user2),
      experienceMatch: this.calculateExperienceMatch(user1, user2),
      personalityFit: this.calculatePersonalityFit(user1, user2),
      scheduleCompatibility: this.calculateScheduleCompatibility(user1, user2),
    };

    const weightedScore =
      factors.goalAlignment * 0.4 +
      factors.experienceMatch * 0.3 +
      factors.personalityFit * 0.2 +
      factors.scheduleCompatibility * 0.1;

    return {
      userId: user2.id,
      score: Math.round(weightedScore),
      factors,
    };
  }

  static findBestMatches(user: User, availableUsers: User[], groupSize: number = 5): User[] {
    const scores = availableUsers
      .filter(u => u.id !== user.id)
      .map(u => ({
        user: u,
        match: this.calculateMatchScore(user, u),
      }))
      .sort((a, b) => b.match.score - a.match.score);

    return scores.slice(0, groupSize - 1).map(s => s.user);
  }

  static suggestGroupForUser(user: User, existingGroups: Group[]): Group[] {
    return existingGroups
      .filter(group => {
        if (group.members.length >= group.maxMembers) return false;
        if (group.members.some(memberId => memberId === user.id)) return false;

        const compatibleGoals = this.hasCompatibleGoals(user, group);
        const appropriateLevel = this.hasAppropriateLevel(user, group);

        return compatibleGoals && appropriateLevel;
      })
      .sort((a, b) => {
        const scoreA = this.calculateGroupCompatibilityScore(user, a);
        const scoreB = this.calculateGroupCompatibilityScore(user, b);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }

  static createOptimalGroup(seedUser: User, availableUsers: User[]): User[] {
    const matches = this.findBestMatches(seedUser, availableUsers, 6);

    const groupMembers = [seedUser];
    const candidates = [...matches];

    while (groupMembers.length < 6 && candidates.length > 0) {
      let bestCandidate = candidates[0];
      let bestScore = 0;

      for (const candidate of candidates) {
        let totalScore = 0;
        for (const member of groupMembers) {
          totalScore += this.calculateMatchScore(member, candidate).score;
        }
        const avgScore = totalScore / groupMembers.length;

        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestCandidate = candidate;
        }
      }

      groupMembers.push(bestCandidate);
      candidates.splice(candidates.indexOf(bestCandidate), 1);
    }

    return groupMembers;
  }

  private static calculateGoalAlignment(user1: User, user2: User): number {
    const goals1 = [...user1.recoveryGoals, ...user1.wellnessGoals];
    const goals2 = [...user2.recoveryGoals, ...user2.wellnessGoals];

    if (goals1.length === 0 || goals2.length === 0) return 50;

    const commonGoals = goals1.filter(goal => goals2.includes(goal));
    const totalGoals = new Set([...goals1, ...goals2]).size;

    return Math.round((commonGoals.length / totalGoals) * 100);
  }

  private static calculateExperienceMatch(user1: User, user2: User): number {
    const experienceMap = { beginner: 1, intermediate: 2, advanced: 3 };
    const diff = Math.abs(experienceMap[user1.experienceLevel] - experienceMap[user2.experienceLevel]);

    return Math.round((2 - diff) * 50);
  }

  private static calculatePersonalityFit(_user1: User, _user2: User): number {
    return Math.round(Math.random() * 40 + 60);
  }

  private static calculateScheduleCompatibility(_user1: User, _user2: User): number {
    return Math.round(Math.random() * 30 + 70);
  }

  private static hasCompatibleGoals(user: User, group: Group): boolean {
    // Note: For this mock implementation, we'll check against the type
    if (group.type === 'recovery' && user.recoveryGoals.length === 0) return false;
    // Since 'anxiety' and 'depression' are not in the original type definition,
    // we'll use a broader check for wellness goals
    if (group.type === 'wellness' && user.wellnessGoals.length === 0) return false;

    return true;
  }

  private static hasAppropriateLevel(_user: User, _group: Group): boolean {
    // Since we only have member IDs and not full user objects in the basic Group type,
    // we'll use a simplified version for now
    // In a real implementation, you'd need to populate the user objects from IDs
    return true; // Simplified for now
  }

  private static calculateGroupCompatibilityScore(_user: User, group: Group): number {
    // Simplified calculation since we don't have full member objects
    // In a real implementation, you'd populate members from IDs and calculate properly
    let baseScore = 50;

    // Adjust based on group size
    if (group.members.length >= 3 && group.members.length <= 6) {
      baseScore += 10;
    }

    return baseScore;
  }
}