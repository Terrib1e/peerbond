import { Member, Group } from '@/types';

export interface MatchingCriteria {
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredGroupSize: number;
  timeZone?: string;
  availableHours?: string[];
}

export interface MatchScore {
  memberId: string;
  score: number;
  factors: {
    goalAlignment: number;
    experienceMatch: number;
    personalityFit: number;
    scheduleCompatibility: number;
  };
}

export class PeerMatchingService {
  static calculateMatchScore(member1: Member, member2: Member): MatchScore {
    const factors = {
      goalAlignment: this.calculateGoalAlignment(member1, member2),
      experienceMatch: this.calculateExperienceMatch(member1, member2),
      personalityFit: this.calculatePersonalityFit(member1, member2),
      scheduleCompatibility: this.calculateScheduleCompatibility(member1, member2),
    };

    const weightedScore =
      factors.goalAlignment * 0.4 +
      factors.experienceMatch * 0.3 +
      factors.personalityFit * 0.2 +
      factors.scheduleCompatibility * 0.1;

    return {
      memberId: member2.id,
      score: Math.round(weightedScore),
      factors,
    };
  }

  static findBestMatches(member: Member, availableMembers: Member[], groupSize: number = 5): Member[] {
    const scores = availableMembers
      .filter(u => u.id !== member.id)
      .map(u => ({
        member: u,
        match: this.calculateMatchScore(member, u),
      }))
      .sort((a, b) => b.match.score - a.match.score);

    return scores.slice(0, groupSize - 1).map(s => s.member);
  }

  static suggestGroupForMember(member: Member, existingGroups: Group[]): Group[] {
    return existingGroups
      .filter(group => {
        if (group.members.length >= group.maxMembers) return false;
        if (group.members.some(memberId => memberId === member.id)) return false;

        const compatibleGoals = this.hasCompatibleGoals(member, group);
        const appropriateLevel = this.hasAppropriateLevel(member, group);

        return compatibleGoals && appropriateLevel;
      })
      .sort((a, b) => {
        const scoreA = this.calculateGroupCompatibilityScore(member, a);
        const scoreB = this.calculateGroupCompatibilityScore(member, b);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }

  static createOptimalGroup(seedMember: Member, availableMembers: Member[]): Member[] {
    const matches = this.findBestMatches(seedMember, availableMembers, 6);

    const groupMembers = [seedMember];
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

  private static calculateGoalAlignment(member1: Member, member2: Member): number {
    const goals1 = [...member1.recoveryGoals, ...member1.wellnessGoals];
    const goals2 = [...member2.recoveryGoals, ...member2.wellnessGoals];

    if (goals1.length === 0 || goals2.length === 0) return 50;

    const commonGoals = goals1.filter(goal => goals2.includes(goal));
    const totalGoals = new Set([...goals1, ...goals2]).size;

    return Math.round((commonGoals.length / totalGoals) * 100);
  }

  private static calculateExperienceMatch(member1: Member, member2: Member): number {
    const experienceMap = { beginner: 1, intermediate: 2, advanced: 3 };
    const diff = Math.abs(experienceMap[member1.experienceLevel] - experienceMap[member2.experienceLevel]);

    return Math.round((2 - diff) * 50);
  }

  private static calculatePersonalityFit(_member1: Member, _member2: Member): number {
    return Math.round(Math.random() * 40 + 60);
  }

  private static calculateScheduleCompatibility(_member1: Member, _member2: Member): number {
    return Math.round(Math.random() * 30 + 70);
  }

  private static hasCompatibleGoals(member: Member, group: Group): boolean {
    // Note: For this mock implementation, we'll check against the type
    if (group.type === 'recovery' && member.recoveryGoals.length === 0) return false;
    // Since 'anxiety' and 'depression' are not in the original type definition,
    // we'll use a broader check for wellness goals
    if (group.type === 'wellness' && member.wellnessGoals.length === 0) return false;

    return true;
  }

  private static hasAppropriateLevel(_member: Member, _group: Group): boolean {
    // Since we only have member IDs and not full member objects in the basic Group type,
    // we'll use a simplified version for now
    // In a real implementation, you'd need to populate the member objects from IDs
    return true; // Simplified for now
  }

  private static calculateGroupCompatibilityScore(_member: Member, group: Group): number {
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