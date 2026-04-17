import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Button, Input, Select } from '../components';
import { Tournament, BracketMatch, BracketRound, BracketFormat } from '../types';
import { v4 as uuidv4 } from 'uuid';
import styles from './Tournament.module.css';

const generateSingleElimBracket = (teams: { teamId: string; seed: number }[], firstTo: number): BracketRound[] => {
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);
  const numTeams = sortedTeams.length;
  const numRounds = Math.ceil(Math.log2(numTeams));
  const bracketSize = Math.pow(2, numRounds);
  
  const getSnakeSeedOrder = (size: number): number[] => {
    const seeds: number[] = [];
    for (let i = 0; i < size; i++) {
      seeds.push(i + 1);
    }
    
    const standardOrder: number[] = [];
    const half = size / 2;
    
    for (let i = 0; i < half; i++) {
      standardOrder.push(seeds[i]);
      standardOrder.push(seeds[size - 1 - i]);
    }
    
    return standardOrder;
  };
  
  const seedOrder = getSnakeSeedOrder(bracketSize);
  
  const rounds: BracketRound[] = [];
  
  let matchId = 1;
  for (let round = 0; round < numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round + 1);
    const roundMatches: BracketMatch[] = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      let team1Id: string | null = null;
      let team2Id: string | null = null;
      
      if (round === 0) {
        const seed1 = seedOrder[i * 2];
        const seed2 = seedOrder[i * 2 + 1];
        const team1 = sortedTeams.find(t => t.seed === seed1);
        const team2 = sortedTeams.find(t => t.seed === seed2);
        team1Id = team1?.teamId || null;
        team2Id = team2?.teamId || null;
      }
      
      const nextMatchId = round < numRounds - 1 ? String(matchesInRound + Math.floor(i / 2) + 1) : null;
      const nextMatchSlot: 1 | 2 = i % 2 === 0 ? 1 : 2;
      
      roundMatches.push({
        id: String(matchId++),
        round,
        matchNumber: i + 1,
        team1Id,
        team2Id,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId,
        nextMatchSlot,
        loserNextMatchId: null,
        loserNextMatchSlot: 1,
        firstTo
      });
    }
    
    rounds.push({
      roundNumber: round + 1,
      name: round === numRounds - 1 ? 'Finals' : round === numRounds - 2 ? 'Semifinals' : `Round ${round + 1}`,
      matches: roundMatches
    });
  }
  
  return rounds;
};

const generateDoubleElimBracket = (teams: { teamId: string; seed: number }[], firstTo: number): { winners: BracketRound[], losers: BracketRound[], finals: BracketRound[] } => {
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);
  const numTeams = sortedTeams.length;
  const numWRounds = Math.ceil(Math.log2(numTeams));
  const bracketSize = Math.pow(2, numWRounds);
  
  const winners: BracketRound[] = [];
  const losers: BracketRound[] = [];
  let wbMatchId = 1;
  
  for (let round = 0; round < numWRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round + 1);
    const roundMatches: BracketMatch[] = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      let team1Id: string | null = null;
      let team2Id: string | null = null;
      
      if (round === 0) {
        const team1Index = i * 2;
        const team2Index = i * 2 + 1;
        team1Id = sortedTeams[team1Index]?.teamId || null;
        team2Id = sortedTeams[team2Index]?.teamId || null;
      }
      
      const nextMatchId = round < numWRounds - 1 ? `W${matchesInRound + Math.floor(i / 2) + 1}` : 'GF1';
      const nextMatchSlot: 1 | 2 = i % 2 === 0 ? 1 : 2;
      
      const loserNextMatchId = round > 0 ? `L${Math.floor(i / 2) + 1}` : null;
      
      roundMatches.push({
        id: `W${wbMatchId++}`,
        round,
        matchNumber: i + 1,
        team1Id,
        team2Id,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId,
        nextMatchSlot,
        loserNextMatchId,
        loserNextMatchSlot: 1,
        firstTo
      });
    }
    
    winners.push({
      roundNumber: round + 1,
      name: round === numWRounds - 1 ? 'Winners Final' : round === numWRounds - 2 ? 'Winners Semifinals' : `Winners Round ${round + 1}`,
      matches: roundMatches
    });
  }
  
  const numLRounds = (numWRounds - 1) * 2;
  let lbMatchId = 1;
  
  for (let round = 0; round < numLRounds; round++) {
    const matchesInRound = Math.max(1, Math.floor(bracketSize / Math.pow(2, Math.floor(round / 2) + 2)));
    const roundMatches: BracketMatch[] = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      const nextMatchId = round < numLRounds - 1 ? `L${lbMatchId + matchesInRound + (round % 2 === 0 ? Math.floor(i / 2) : i)}` : (round % 2 === 0 ? 'GF2' : null);
      const nextMatchSlot: 1 | 2 = 1;
      
      roundMatches.push({
        id: `L${lbMatchId++}`,
        round,
        matchNumber: i + 1,
        team1Id: null,
        team2Id: null,
        team1Score: 0,
        team2Score: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId,
        nextMatchSlot,
        loserNextMatchId: null,
        loserNextMatchSlot: 1,
        firstTo
      });
    }
    
    losers.push({
      roundNumber: round + 1,
      name: round === numLRounds - 1 ? 'Losers Final' : `Losers Round ${round + 1}`,
      matches: roundMatches
    });
  }
  
  const finals: BracketRound[] = [
    {
      roundNumber: 1,
      name: 'Grand Final',
      matches: [
        {
          id: 'GF1',
          round: 0,
          matchNumber: 1,
          team1Id: null,
          team2Id: null,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          status: 'pending',
          nextMatchId: null,
          nextMatchSlot: 1,
          loserNextMatchId: 'GF2',
          loserNextMatchSlot: 2,
          firstTo
        },
        {
          id: 'GF2',
          round: 1,
          matchNumber: 1,
          team1Id: null,
          team2Id: null,
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          status: 'pending',
          nextMatchId: null,
          nextMatchSlot: 1,
          loserNextMatchId: null,
          loserNextMatchSlot: 1,
          firstTo
        }
      ]
    }
  ];
  
  return { winners, losers, finals };
};

const generateRoundRobinWithGroups = (
  teams: { teamId: string; seed: number }[],
  firstTo: number,
  numGroups: number
): { groupMatches: BracketMatch[][], groupTeams: string[][], groupStandings: { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[][] } => {
  const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);
  const teamIds = sortedTeams.map(t => t.teamId);
  const teamsPerGroup = Math.ceil(teamIds.length / numGroups);
  
  const groupTeams: string[][] = [];
  for (let g = 0; g < numGroups; g++) {
    groupTeams.push([]);
  }
  
  for (let i = 0; i < teamIds.length; i++) {
    const seed = sortedTeams[i].seed;
    let groupIndex: number;
    
    if (numGroups === 1) {
      groupIndex = 0;
    } else {
      const position = seed - 1;
      const round = Math.floor(position / teamsPerGroup);
      const withinRoundPos = position % teamsPerGroup;
      
      if (round % 2 === 0) {
        groupIndex = withinRoundPos % numGroups;
      } else {
        groupIndex = (numGroups - 1) - (withinRoundPos % numGroups);
      }
    }
    
    if (groupIndex >= 0 && groupIndex < numGroups) {
      groupTeams[groupIndex].push(teamIds[i]);
    }
  }
  
  const groupMatches: BracketMatch[][] = [];
  const groupStandings: { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[][] = [];
  
  for (let g = 0; g < numGroups; g++) {
    const groupTeamIds = groupTeams[g];
    const matches: BracketMatch[] = [];
    const groupLetter = String.fromCharCode(65 + g);
    let matchCounter = 1;
    
    for (let i = 0; i < groupTeamIds.length; i++) {
      for (let j = i + 1; j < groupTeamIds.length; j++) {
        matches.push({
          id: `${groupLetter}${String(matchCounter++).padStart(2, '0')}`,
          round: i,
          matchNumber: matches.length + 1,
          team1Id: groupTeamIds[i],
          team2Id: groupTeamIds[j],
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          status: 'pending',
          nextMatchId: null,
          nextMatchSlot: 1,
          loserNextMatchId: null,
          loserNextMatchSlot: 1,
          firstTo
        });
      }
    }
    
    const standings = groupTeamIds.map(teamId => ({
      teamId,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      points: 0
    }));
    
    groupMatches.push(matches);
    groupStandings.push(standings);
  }
  
  return { groupMatches, groupTeams, groupStandings };
};

interface MatchModalState {
  match: BracketMatch | null;
  bracketType: 'winners' | 'losers' | 'finals';
}

const TournamentView: React.FC = () => {
  const { state, dispatch } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [matchModal, setMatchModal] = useState<MatchModalState>({ match: null, bracketType: 'winners' });
  const [newTournament, setNewTournament] = useState({ name: '', format: 'single-elim' as BracketFormat, firstTo: 3, grandFinalsReset: true, numGroups: 1 });
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [seeds, setSeeds] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');
  const [editSeeds, setEditSeeds] = useState(false);
  const [draggedSeed, setDraggedSeed] = useState<number | null>(null);
  const [editMatchups, setEditMatchups] = useState(false);
  const [draggedMatchIndex, setDraggedMatchIndex] = useState<number | null>(null);
  const [showAddTeamsModal, setShowAddTeamsModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const tournaments = state.tournaments;
  const currentTournament = state.currentTournament;
  const teams = state.teams;

  const teamLogoUrls = useMemo(() => {
    const urls: Record<string, string | null> = {};
    for (const team of teams) {
      if (team.logoAssetId) {
        const logo = state.assets.logos.find(a => a.id === team.logoAssetId);
        urls[team.id] = logo?.path || null;
      } else {
        urls[team.id] = null;
      }
    }
    return urls;
  }, [teams, state.assets.logos]);

  const getTeamById = (id: string) => teams.find(t => t.id === id);
  const getSeed = (teamId: string | null) => {
    if (!teamId || !currentTournament) return null;
    return currentTournament.teams.find(t => t.teamId === teamId)?.seed;
  };

  const handleCreateTournament = () => {
    if (!newTournament.name.trim()) return;
    
    let winnersBracket: BracketRound[] = [];
    let losersBracket: BracketRound[] = [];
    let grandFinal: BracketRound[] = [];
    
    if (newTournament.format === 'single-elim' && selectedTeamIds.length >= 2) {
      winnersBracket = generateSingleElimBracket(
        selectedTeamIds.map((id, idx) => ({ teamId: id, seed: seeds[id] || idx + 1 })),
        newTournament.firstTo
      );
    } else if (newTournament.format === 'double-elim' && selectedTeamIds.length >= 2) {
      const doubleElim = generateDoubleElimBracket(
        selectedTeamIds.map((id, idx) => ({ teamId: id, seed: seeds[id] || idx + 1 })),
        newTournament.firstTo
      );
      winnersBracket = doubleElim.winners;
      losersBracket = doubleElim.losers;
      grandFinal = doubleElim.finals;
    }
    
    let roundRobinStandings: Record<string, { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[]> = {};
    let groups: { id: string; name: string; teamIds: string[] }[] = [];
    
    const numGroups = newTournament.format === 'round-robin' ? (newTournament.numGroups || 1) : 1;
    
    if (newTournament.format === 'round-robin') {
      const teamsArr = selectedTeamIds.map((id, idx) => ({ teamId: id, seed: seeds[id] || idx + 1 }));
      const rr = generateRoundRobinWithGroups(teamsArr, newTournament.firstTo, numGroups);
      winnersBracket = [];
      roundRobinStandings = {};
      groups = [];
      
      for (let i = 0; i < numGroups; i++) {
        const groupName = String.fromCharCode(65 + i);
        groups.push({ id: `group-${i}`, name: `Group ${groupName}`, teamIds: rr.groupTeams[i] || [] });
        winnersBracket.push({ roundNumber: i + 1, name: `Group ${groupName}`, matches: rr.groupMatches[i] || [] });
        roundRobinStandings[`group-${i}`] = rr.groupStandings[i] || [];
      }
    }
    
    const tournament: Tournament = {
      id: uuidv4(),
      name: newTournament.name,
      format: newTournament.format,
      teams: selectedTeamIds.map((id, idx) => ({ teamId: id, seed: seeds[id] || idx + 1 })),
      rounds: [],
      winnersBracket,
      losersBracket,
      grandFinal,
      groups,
      roundRobinStandings,
      championTeamId: null,
      createdAt: new Date().toISOString(),
      status: winnersBracket.length > 0 || newTournament.format === 'round-robin' ? 'in-progress' : 'setup',
      defaultFirstTo: newTournament.firstTo,
      grandFinalsReset: newTournament.format === 'double-elim'
    };
    
    dispatch({ type: 'ADD_TOURNAMENT', payload: tournament });
    dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: tournament });
    setShowCreateModal(false);
    setNewTournament({ name: '', format: 'single-elim', firstTo: 3, grandFinalsReset: true, numGroups: 1 });
    setSelectedTeamIds([]);
    setSeeds({});
    setViewMode('bracket');
  };

  const handleSelectTournament = (tournament: Tournament) => {
    dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: tournament });
    setViewMode('bracket');
  };

  const handleDeleteTournament = (id: string) => {
    if (confirm('Delete this tournament?')) {
      dispatch({ type: 'DELETE_TOURNAMENT', payload: id });
    }
  };

  const canEditTeams = (): boolean => {
    if (!currentTournament) return false;
    const round1 = currentTournament.winnersBracket[0];
    if (!round1) return true;
    return !round1.matches.some(m => m.status !== 'pending');
  };

  const handleUpdateTeams = (newTeamIds: string[], groupOverrides?: Record<string, number>) => {
    if (!currentTournament || !canEditTeams()) return;
    
    const sortedTeams = newTeamIds
      .map((id, idx) => ({ teamId: id, seed: idx + 1 }))
      .sort((a, b) => a.seed - b.seed);
    
    let winnersBracket: BracketRound[] = [];
    let roundRobinStandings: Record<string, { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[]> = {};
    let groups: { id: string; name: string; teamIds: string[] }[] = [];
    
    if (currentTournament.format === 'round-robin') {
      const numGroups = currentTournament.groups?.length || 1;
      
      if (groupOverrides && Object.keys(groupOverrides).length > 0) {
        const teamGroups: string[][] = [];
        for (let i = 0; i < numGroups; i++) {
          teamGroups.push([]);
        }
        
        sortedTeams.forEach((team, idx) => {
          const groupIdx = groupOverrides[team.teamId] !== undefined ? groupOverrides[team.teamId] : idx % numGroups;
          if (groupIdx >= 0 && groupIdx < numGroups) {
            teamGroups[groupIdx].push(team.teamId);
          }
        });
        
        const allMatches: BracketMatch[][] = [];
        const allStandings: { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[][] = [];
        
        for (let g = 0; g < numGroups; g++) {
          const groupTeamIds = teamGroups[g];
          const matches: BracketMatch[] = [];
          const groupLetter = String.fromCharCode(65 + g);
          let matchCounter = 1;
          
          for (let i = 0; i < groupTeamIds.length; i++) {
            for (let j = i + 1; j < groupTeamIds.length; j++) {
              matches.push({
                id: `${groupLetter}${String(matchCounter++).padStart(2, '0')}`,
                round: i,
                matchNumber: matches.length + 1,
                team1Id: groupTeamIds[i],
                team2Id: groupTeamIds[j],
                team1Score: 0,
                team2Score: 0,
                winnerId: null,
                status: 'pending',
                nextMatchId: null,
                nextMatchSlot: 1,
                loserNextMatchId: null,
                loserNextMatchSlot: 1,
                firstTo: currentTournament.defaultFirstTo
              });
            }
          }
          
          const standings = groupTeamIds.map(teamId => ({
            teamId,
            played: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            points: 0
          }));
          
          allMatches.push(matches);
          allStandings.push(standings);
          
          const groupName = String.fromCharCode(65 + g);
          winnersBracket.push({ roundNumber: g + 1, name: `Group ${groupName}`, matches });
          groups.push({ id: `group-${g}`, name: `Group ${groupName}`, teamIds: groupTeamIds });
          roundRobinStandings[`group-${g}`] = standings;
        }
      } else {
        const rr = generateRoundRobinWithGroups(sortedTeams, currentTournament.defaultFirstTo, numGroups);
        
        for (let i = 0; i < numGroups; i++) {
          const groupName = String.fromCharCode(65 + i);
          groups.push({ id: `group-${i}`, name: `Group ${groupName}`, teamIds: rr.groupTeams[i] || [] });
          winnersBracket.push({ roundNumber: i + 1, name: `Group ${groupName}`, matches: rr.groupMatches[i] || [] });
          roundRobinStandings[`group-${i}`] = rr.groupStandings[i] || [];
        }
      }
    } else if (currentTournament.format === 'single-elim') {
      winnersBracket = generateSingleElimBracket(sortedTeams, currentTournament.defaultFirstTo);
    } else if (currentTournament.format === 'double-elim') {
      const doubleElim = generateDoubleElimBracket(sortedTeams, currentTournament.defaultFirstTo);
      winnersBracket = doubleElim.winners;
    }
    
    const updated = {
      ...currentTournament,
      teams: sortedTeams,
      winnersBracket,
      losersBracket: currentTournament.format === 'double-elim' ? currentTournament.losersBracket : [],
      grandFinal: currentTournament.format === 'double-elim' ? currentTournament.grandFinal : [],
      groups: currentTournament.format === 'round-robin' ? groups : [],
      roundRobinStandings: currentTournament.format === 'round-robin' ? roundRobinStandings : {}
    };
    
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: updated });
    setShowAddTeamsModal(false);
  };

  const handleBackToList = () => {
    dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: null });
    setViewMode('list');
  };

  const openMatchModal = (match: BracketMatch, bracketType: 'winners' | 'losers' | 'finals') => {
    setMatchModal({ match: { ...match }, bracketType });
  };

  const saveMatchModal = () => {
    if (!matchModal.match || !currentTournament) return;
    
    const updatedMatch = { ...matchModal.match };
    if (updatedMatch.team1Score >= updatedMatch.firstTo || updatedMatch.team2Score >= updatedMatch.firstTo) {
      if (updatedMatch.team1Score > updatedMatch.team2Score) {
        updatedMatch.winnerId = updatedMatch.team1Id;
        updatedMatch.status = 'completed';
      } else if (updatedMatch.team2Score > updatedMatch.team1Score) {
        updatedMatch.winnerId = updatedMatch.team2Id;
        updatedMatch.status = 'completed';
      }
    } else if (updatedMatch.team1Score > 0 || updatedMatch.team2Score > 0) {
      updatedMatch.status = 'live';
    } else {
      updatedMatch.status = 'pending';
    }
    
    dispatch({ 
      type: 'UPDATE_BRACKET_MATCH', 
      payload: { tournamentId: currentTournament.id, match: updatedMatch, bracketType: matchModal.bracketType } 
    });

    if (updatedMatch.winnerId && updatedMatch.nextMatchId) {
      const { match: nextMatch, bracketType: nextBracketType } = findMatchByIdAndType(updatedMatch.nextMatchId);
      if (nextMatch) {
        const updatedNextMatch = {
          ...nextMatch,
          [updatedMatch.nextMatchSlot === 1 ? 'team1Id' : 'team2Id']: updatedMatch.winnerId
        };
        dispatch({ 
          type: 'UPDATE_BRACKET_MATCH', 
          payload: { tournamentId: currentTournament.id, match: updatedNextMatch, bracketType: nextBracketType } 
        });
      }
    }

    if (updatedMatch.winnerId && updatedMatch.loserNextMatchId) {
      const loserId = updatedMatch.winnerId === updatedMatch.team1Id ? updatedMatch.team2Id : updatedMatch.team1Id;
      if (loserId) {
        const { match: nextMatch, bracketType: nextBracketType } = findMatchByIdAndType(updatedMatch.loserNextMatchId);
        if (nextMatch) {
          const updatedNextMatch = {
            ...nextMatch,
            [updatedMatch.loserNextMatchSlot === 1 ? 'team1Id' : 'team2Id']: loserId
          };
          dispatch({ 
            type: 'UPDATE_BRACKET_MATCH', 
            payload: { tournamentId: currentTournament.id, match: updatedNextMatch, bracketType: nextBracketType } 
          });
        }
      }
    }

    if (currentTournament.format === 'round-robin' && updatedMatch.status === 'completed' && updatedMatch.team1Id && updatedMatch.team2Id) {
      const newStandings: Record<string, { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[]> = {};
      
      for (let g = 0; g < (currentTournament.groups || []).length; g++) {
        const group = currentTournament.groups[g];
        const groupRound = currentTournament.winnersBracket[g];
        const groupTeamIds = group?.teamIds || [];
        
        let groupStandings = groupTeamIds.map(teamId => ({
          teamId,
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          points: 0
        }));
        
        for (const match of groupRound?.matches || []) {
          if (match.status === 'completed' && match.team1Id && match.team2Id && match.winnerId) {
            const team1Idx = groupStandings.findIndex(s => s.teamId === match.team1Id);
            const team2Idx = groupStandings.findIndex(s => s.teamId === match.team2Id);
            
            if (team1Idx >= 0) {
              groupStandings[team1Idx].played++;
              groupStandings[team1Idx].pointsFor += match.team1Score;
              groupStandings[team1Idx].pointsAgainst += match.team2Score;
              if (match.winnerId === match.team1Id) {
                groupStandings[team1Idx].wins++;
                groupStandings[team1Idx].points += 3;
              } else {
                groupStandings[team1Idx].losses++;
              }
            }
            
            if (team2Idx >= 0) {
              groupStandings[team2Idx].played++;
              groupStandings[team2Idx].pointsFor += match.team2Score;
              groupStandings[team2Idx].pointsAgainst += match.team1Score;
              if (match.winnerId === match.team2Id) {
                groupStandings[team2Idx].wins++;
                groupStandings[team2Idx].points += 3;
              } else {
                groupStandings[team2Idx].losses++;
              }
            }
          }
        }
        
        newStandings[group.id] = groupStandings;
      }
      
      if (Object.keys(newStandings).length > 0) {
        dispatch({ 
          type: 'UPDATE_TOURNAMENT', 
          payload: { ...currentTournament, roundRobinStandings: newStandings } 
        });
      }
    }
    
    setMatchModal({ match: null, bracketType: 'winners' });
  };

  const findMatchByIdAndType = (matchId: string): { match: BracketMatch | null; bracketType: 'winners' | 'losers' | 'finals' } => {
    if (!currentTournament) return { match: null, bracketType: 'winners' };
    
    for (const round of currentTournament.winnersBracket) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) return { match, bracketType: 'winners' as const };
    }
    for (const round of currentTournament.losersBracket) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) return { match, bracketType: 'losers' as const };
    }
    for (const round of currentTournament.grandFinal) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) return { match, bracketType: 'finals' as const };
    }
    return { match: null, bracketType: 'winners' };
  };

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const updateSeed = (teamId: string, seed: number) => {
    setSeeds(prev => ({ ...prev, [teamId]: seed }));
  };

  const bulkUpdateFirstTo = (firstTo: number, scope: 'all' | 'winners' | 'losers') => {
    if (!currentTournament) return;
    
    const updateRound = (round: BracketRound): BracketRound => ({
      ...round,
      matches: round.matches.map(m => ({ ...m, firstTo }))
    });
    
    let updated = { ...currentTournament };
    
    if (scope === 'all' || scope === 'winners') {
      updated.winnersBracket = updated.winnersBracket.map(updateRound);
    }
    if (scope === 'all' || scope === 'losers') {
      updated.losersBracket = updated.losersBracket.map(updateRound);
    }
    if (scope === 'all' && updated.grandFinal) {
      updated.grandFinal = updated.grandFinal.map(updateRound);
    }
    if (scope === 'all') {
      updated.defaultFirstTo = firstTo;
    }
    
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: updated });
  };

  const canEditSeeds = (): boolean => {
    if (!currentTournament) return false;
    const round1 = currentTournament.winnersBracket[0];
    if (!round1) return true;
    return !round1.matches.some(m => m.status !== 'pending');
  };

  const handleDragStart = (e: React.DragEvent, seed: number) => {
    if (!canEditSeeds()) return;
    setDraggedSeed(seed);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canEditSeeds()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSeed: number) => {
    e.preventDefault();
    if (!canEditSeeds() || draggedSeed === null || !currentTournament) return;
    
    const newTeams = [...currentTournament.teams];
    const draggedIndex = newTeams.findIndex(t => t.seed === draggedSeed);
    const targetIndex = newTeams.findIndex(t => t.seed === targetSeed);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [draggedTeam] = newTeams.splice(draggedIndex, 1);
    newTeams.splice(targetIndex, 0, draggedTeam);
    
    const updatedTeams = newTeams.map((t, idx) => ({ ...t, seed: idx + 1 }));
    
    const updated = { ...currentTournament, teams: updatedTeams };
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: updated });
    
    setDraggedSeed(null);
  };

  const canEditMatchups = (): boolean => {
    if (!currentTournament) return false;
    const round1 = currentTournament.winnersBracket[0];
    if (!round1) return false;
    return !round1.matches.some(m => m.status !== 'pending');
  };

  const handleTeamDragStart = (e: React.DragEvent, matchIndex: number, teamSlot: 'team1' | 'team2') => {
    if (!canEditMatchups()) return;
    setDraggedMatchIndex(matchIndex);
    e.dataTransfer.setData('teamSlot', teamSlot);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTeamDragOver = (e: React.DragEvent) => {
    if (!canEditMatchups()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTeamDrop = (e: React.DragEvent, targetMatchIndex: number, targetTeamSlot: 'team1' | 'team2') => {
    e.preventDefault();
    if (!canEditMatchups() || draggedMatchIndex === null || !currentTournament) return;
    
    const sourceSlot = e.dataTransfer.getData('teamSlot') as 'team1' | 'team2';
    if (!sourceSlot) return;
    
    const round1 = currentTournament.winnersBracket[0];
    if (!round1) return;
    
    const matches = [...round1.matches];
    const sourceMatch = matches[draggedMatchIndex];
    const targetMatch = matches[targetMatchIndex];
    
    if (!sourceMatch || !targetMatch) return;
    
    const sourceTeamId = sourceSlot === 'team1' ? sourceMatch.team1Id : sourceMatch.team2Id;
    const targetTeamId = targetTeamSlot === 'team1' ? targetMatch.team1Id : targetMatch.team2Id;
    
    const updatedSourceMatch = {
      ...sourceMatch,
      [sourceSlot === 'team1' ? 'team1Id' : 'team2Id']: targetTeamId
    };
    
    const updatedTargetMatch = {
      ...targetMatch,
      [targetTeamSlot === 'team1' ? 'team1Id' : 'team2Id']: sourceTeamId
    };
    
    matches[draggedMatchIndex] = updatedSourceMatch;
    matches[targetMatchIndex] = updatedTargetMatch;
    
    const updated = {
      ...currentTournament,
      winnersBracket: [
        { ...round1, matches },
        ...currentTournament.winnersBracket.slice(1)
      ]
    };
    
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: updated });
    setDraggedMatchIndex(null);
  };

  const renderRoundRobin = () => {
    if (!currentTournament) return null;
    
    const groups = currentTournament.groups || [];
    const hasMultipleGroups = groups.length > 1;
    
    const toggleGroup = (groupId: string) => {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    };
    
    const getGroupStandings = (groupId: string) => {
      return currentTournament.roundRobinStandings[groupId] || [];
    };
    
    const getGroupMatches = (groupId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return [];
      const round = currentTournament.winnersBracket.find(r => r.name === group.name);
      return round?.matches || [];
    };
    
    const singleGroupId = groups.length === 1 ? groups[0].id : 'group-0';
    const sortedStandings = getGroupStandings(singleGroupId).sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));
    
    if (!hasMultipleGroups) {
      const matches = getGroupMatches('group-0');
      return (
        <div className={styles.fullBracketContainer}>
          <div className={styles.bracketSection}>
            <div className={styles.sectionHeader}>
              <h3>Standings</h3>
            </div>
            <div className={styles.standingsTable}>
              <div className={styles.standingsHeader}>
                <span className={styles.standingsPos}>#</span>
                <span className={styles.standingsTeam}>Team</span>
                <span className={styles.standingsStat}>P</span>
                <span className={styles.standingsStat}>W</span>
                <span className={styles.standingsStat}>L</span>
                <span className={styles.standingsStat}>D</span>
                <span className={styles.standingsStat}>PF</span>
                <span className={styles.standingsStat}>PA</span>
                <span className={styles.standingsStat}>Pts</span>
              </div>
              {sortedStandings.map((entry, idx) => {
                const team = getTeamById(entry.teamId);
                return (
                  <div key={entry.teamId} className={styles.standingsRow}>
                    <span className={styles.standingsPos}>{idx + 1}</span>
                    <span className={styles.standingsTeam}>{team?.name || 'Unknown'}</span>
                    <span className={styles.standingsStat}>{entry.played}</span>
                    <span className={styles.standingsStat}>{entry.wins}</span>
                    <span className={styles.standingsStat}>{entry.losses}</span>
                    <span className={styles.standingsStat}>{entry.draws}</span>
                    <span className={styles.standingsStat}>{entry.pointsFor}</span>
                    <span className={styles.standingsStat}>{entry.pointsAgainst}</span>
                    <span className={styles.standingsStat}>{entry.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className={styles.bracketSection}>
            <div className={styles.sectionHeader}>
              <h3>Matches</h3>
            </div>
            <div className={styles.rrMatches}>
              {matches.map(match => renderMatchCard(match, 'winners'))}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.fullBracketContainer}>
        {groups.map(group => {
          const standings = getGroupStandings(group.id).sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));
          const matches = getGroupMatches(group.id);
          const isExpanded = expandedGroups.has(group.id);
          
          return (
            <div key={group.id} className={styles.groupContainer}>
              <div 
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.id)}
              >
                <span className={styles.groupExpandIcon}>{isExpanded ? '▼' : '▶'}</span>
                <h3>{group.name}</h3>
                <span className={styles.groupTeamCount}>{standings.length} teams</span>
              </div>
              
              {isExpanded && (
                <>
                  <div className={styles.standingsTable}>
                    <div className={styles.standingsHeader}>
                      <span className={styles.standingsPos}>#</span>
                      <span className={styles.standingsTeam}>Team</span>
                      <span className={styles.standingsStat}>P</span>
                      <span className={styles.standingsStat}>W</span>
                      <span className={styles.standingsStat}>L</span>
                      <span className={styles.standingsStat}>D</span>
                      <span className={styles.standingsStat}>PF</span>
                      <span className={styles.standingsStat}>PA</span>
                      <span className={styles.standingsStat}>Pts</span>
                    </div>
                    {standings.map((entry, idx) => {
                      const team = getTeamById(entry.teamId);
                      return (
                        <div key={entry.teamId} className={styles.standingsRow}>
                          <span className={styles.standingsPos}>{idx + 1}</span>
                          <span className={styles.standingsTeam}>{team?.name || 'Unknown'}</span>
                          <span className={styles.standingsStat}>{entry.played}</span>
                          <span className={styles.standingsStat}>{entry.wins}</span>
                          <span className={styles.standingsStat}>{entry.losses}</span>
                          <span className={styles.standingsStat}>{entry.draws}</span>
                          <span className={styles.standingsStat}>{entry.pointsFor}</span>
                          <span className={styles.standingsStat}>{entry.pointsAgainst}</span>
                          <span className={styles.standingsStat}>{entry.points}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className={styles.groupMatches}>
                    <h4>Matches</h4>
                    <div className={styles.rrMatches}>
                      {matches.map(match => renderMatchCard(match, 'winners'))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMatchCard = (match: BracketMatch, bracketType: 'winners' | 'losers' | 'finals') => {
    const team1 = match.team1Id ? getTeamById(match.team1Id) : null;
    const team2 = match.team2Id ? getTeamById(match.team2Id) : null;
    
    const isReady = match.team1Id && match.team2Id;
    const isComplete = match.status === 'completed';
    const isLive = match.status === 'live';
    
    return (
      <div 
        key={match.id}
        className={`${styles.matchCard} ${isComplete ? styles.completed : ''} ${isLive ? styles.live : ''} ${!isReady ? styles.pending : ''}`}
        onClick={() => openMatchModal(match, bracketType)}
      >
        <div className={styles.matchStatus}>
          <span className={`${styles.statusDot} ${isComplete ? styles.statusComplete : isLive ? styles.statusLive : styles.statusPending}`} />
          <span className={styles.matchId}>{match.id}</span>
        </div>
        <div className={styles.matchTeamsCompact}>
          <div className={`${styles.teamRow} ${match.winnerId === match.team1Id ? styles.winner : ''}`}>
            <span className={styles.seed}>{getSeed(match.team1Id) || '-'}</span>
            <span className={styles.name}>{team1?.name || 'TBD'}</span>
            <span className={styles.score}>{match.team1Score}</span>
          </div>
          <div className={`${styles.teamRow} ${match.winnerId === match.team2Id ? styles.winner : ''}`}>
            <span className={styles.seed}>{getSeed(match.team2Id) || '-'}</span>
            <span className={styles.name}>{team2?.name || 'TBD'}</span>
            <span className={styles.score}>{match.team2Score}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    if (!currentTournament) return null;

    if (currentTournament.format === 'round-robin') {
      return renderRoundRobin();
    }

    const hasGroups = (currentTournament.groups?.length ?? 0) > 0;

    return (
      <div className={styles.fullBracketContainer}>
        {currentTournament.winnersBracket.length > 0 && (
          <div className={styles.bracketSection}>
            <div className={styles.sectionHeader}>
              <h3>{hasGroups ? 'Group' : 'Upper Bracket'}</h3>
              {canEditMatchups() && !editMatchups && (
                <Button size="sm" variant="secondary" onClick={() => setEditMatchups(true)}>Edit Matchups</Button>
              )}
              {(editMatchups) && (
                <Button size="sm" variant="secondary" onClick={() => setEditMatchups(false)}>Done</Button>
              )}
            </div>
            <div className={styles.bracket}>
              {currentTournament.winnersBracket.map((round, roundIdx) => (
                <div key={round.roundNumber} className={styles.round}>
                  <div className={styles.roundHeader}>{round.name}</div>
                  <div className={styles.roundMatches}>
                    {round.matches.map((match, matchIdx) => (
                      roundIdx === 0 && editMatchups ? (
                        <div
                          key={match.id}
                          className={`${styles.matchCard} ${styles.editable}`}
                        >
                          <div className={styles.matchTeamsEditable}>
                            {(['team1', 'team2'] as const).map((slot) => {
                              const teamId = slot === 'team1' ? match.team1Id : match.team2Id;
                              const team = teamId ? getTeamById(teamId) : null;
                              const seed = getSeed(teamId);
                              return (
                                <div
                                  key={slot}
                                  className={styles.teamSlotEditable}
                                  draggable
                                  onDragStart={(e) => handleTeamDragStart(e, matchIdx, slot)}
                                  onDragOver={handleTeamDragOver}
                                  onDrop={(e) => handleTeamDrop(e, matchIdx, slot)}
                                >
                                  <span className={styles.dragHandle}>⋮⋮</span>
                                  <span className={styles.seed}>{seed || '-'}</span>
                                  <span className={styles.name}>{team?.name || 'TBD'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        renderMatchCard(match, 'winners')
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTournament.losersBracket.length > 0 && (
          <div className={styles.bracketSection}>
            <div className={styles.sectionHeader}>
              <h3>Lower Bracket</h3>
            </div>
            <div className={styles.bracket}>
              {currentTournament.losersBracket.map((round) => (
                <div key={`L${round.roundNumber}`} className={styles.round}>
                  <div className={styles.roundHeader}>{round.name}</div>
                  <div className={styles.roundMatches}>
                    {round.matches.map(match => renderMatchCard(match, 'losers'))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTournament.grandFinal.length > 0 && (
          <div className={styles.bracketSection}>
            <div className={styles.sectionHeader}>
              <h3>Grand Finals</h3>
            </div>
            <div className={styles.bracket}>
              {currentTournament.grandFinal.map((round) => (
                <div key={`GF${round.roundNumber}`} className={styles.round}>
                  <div className={styles.roundHeader}>{round.name}</div>
                  <div className={styles.roundMatches}>
                    {round.matches.map(match => renderMatchCard(match, 'finals'))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {currentTournament.championTeamId && (
          <div className={styles.championSection}>
            <div className={styles.championLabel}>Champion</div>
            <div className={styles.championTeam}>
              {getTeamById(currentTournament.championTeamId)?.name}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (viewMode === 'bracket' && currentTournament) {
    return (
      <div className={styles.container}>
        <div className={styles.bracketHeader}>
          <Button variant="secondary" onClick={handleBackToList}>← Back</Button>
          <div className={styles.bracketTitle}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className={styles.nameInput}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editNameValue.trim()) {
                        dispatch({ type: 'UPDATE_TOURNAMENT', payload: { ...currentTournament, name: editNameValue.trim() } });
                      }
                      setEditingName(false);
                    } else if (e.key === 'Escape') {
                      setEditingName(false);
                    }
                  }}
                  onBlur={() => {
                    if (editNameValue.trim()) {
                      dispatch({ type: 'UPDATE_TOURNAMENT', payload: { ...currentTournament, name: editNameValue.trim() } });
                    }
                    setEditingName(false);
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1>{currentTournament.name}</h1>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => { setEditNameValue(currentTournament.name); setEditingName(true); }}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ✎
                </Button>
              </div>
            )}
            <span className={`${styles.formatBadge}`}>
{currentTournament.format === 'single-elim' ? 'Single Elimination' : currentTournament.format === 'double-elim' ? 'Double Elimination' : 'Round Robin'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canEditTeams() && (
              <Button variant="secondary" onClick={() => setShowAddTeamsModal(true)}>Edit Teams</Button>
            )}
            <Button variant="secondary" onClick={() => setShowSettingsModal(true)}>Settings</Button>
          </div>
        </div>
        {renderBracket()}

        {showSettingsModal && (
          <div className={styles.modalOverlay} onClick={() => { setShowSettingsModal(false); setEditSeeds(false); setEditMatchups(false); }}>
            <div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
              <div className={styles.settingsHeader}>
                <h3>Tournament Settings</h3>
                <Button size="sm" variant="secondary" onClick={() => { setShowSettingsModal(false); setEditMatchups(false); }}>×</Button>
              </div>
              
              <div className={styles.settingsSection}>
                <div className={styles.settingsInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Format</span>
                    <span className={styles.infoValue}>{currentTournament.format === 'single-elim' ? 'Single Elimination' : currentTournament.format === 'double-elim' ? 'Double Elimination' : 'Round Robin'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Teams</span>
                    <span className={styles.infoValue}>{currentTournament.teams.length}</span>
                  </div>
                </div>
              </div>

              <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>
                  <h4>Match Format (First To)</h4>
                </div>
                <div className={styles.formatTicker}>
                  <button 
                    className={styles.tickerBtn}
                    onClick={() => bulkUpdateFirstTo(Math.max(1, currentTournament.defaultFirstTo - 1), 'all')}
                  >−</button>
                  <span className={styles.tickerValue}>{currentTournament.defaultFirstTo}</span>
                  <button 
                    className={styles.tickerBtn}
                    onClick={() => bulkUpdateFirstTo(Math.min(10, currentTournament.defaultFirstTo + 1), 'all')}
                  >+</button>
                </div>
              </div>

              {currentTournament.format === 'round-robin' && (() => {
                const hasNoResults = !currentTournament.winnersBracket.some(r => 
                  r.matches.some(m => m.status === 'completed' || m.status === 'live')
                );
                const currentGroupCount = currentTournament.groups?.length || 1;
                
                return hasNoResults && (
                  <div className={styles.settingsSection}>
                    <div className={styles.sectionTitle}>
                      <h4>Number of Groups</h4>
                    </div>
                    <div className={styles.formatTicker}>
                      <button 
                        className={styles.tickerBtn}
                        onClick={() => {
                          const newCount = Math.max(1, currentGroupCount - 1);
                          const rr = generateRoundRobinWithGroups(
                            currentTournament.teams.sort((a, b) => a.seed - b.seed),
                            currentTournament.defaultFirstTo,
                            newCount
                          );
                          const winnersBracket: BracketRound[] = [];
                          const groups: { id: string; name: string; teamIds: string[] }[] = [];
                          const roundRobinStandings: Record<string, { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[]> = {};
                          
                          for (let i = 0; i < newCount; i++) {
                            const groupName = String.fromCharCode(65 + i);
                            groups.push({ id: `group-${i}`, name: `Group ${groupName}`, teamIds: rr.groupTeams[i] || [] });
                            winnersBracket.push({ roundNumber: i + 1, name: `Group ${groupName}`, matches: rr.groupMatches[i] || [] });
                            roundRobinStandings[`group-${i}`] = rr.groupStandings[i] || [];
                          }
                          
                          dispatch({ 
                            type: 'UPDATE_TOURNAMENT', 
                            payload: { 
                              ...currentTournament, 
                              winnersBracket, 
                              groups, 
                              roundRobinStandings 
                            } 
                          });
                        }}
                        disabled={currentGroupCount <= 1}
                      >−</button>
                      <span className={styles.tickerValue}>{currentGroupCount}</span>
                      <button 
                        className={styles.tickerBtn}
                        onClick={() => {
                          const newCount = Math.min(8, currentGroupCount + 1);
                          const rr = generateRoundRobinWithGroups(
                            currentTournament.teams.sort((a, b) => a.seed - b.seed),
                            currentTournament.defaultFirstTo,
                            newCount
                          );
                          const winnersBracket: BracketRound[] = [];
                          const groups: { id: string; name: string; teamIds: string[] }[] = [];
                          const roundRobinStandings: Record<string, { teamId: string; played: number; wins: number; losses: number; draws: number; pointsFor: number; pointsAgainst: number; points: number }[]> = {};
                          
                          for (let i = 0; i < newCount; i++) {
                            const groupName = String.fromCharCode(65 + i);
                            groups.push({ id: `group-${i}`, name: `Group ${groupName}`, teamIds: rr.groupTeams[i] || [] });
                            winnersBracket.push({ roundNumber: i + 1, name: `Group ${groupName}`, matches: rr.groupMatches[i] || [] });
                            roundRobinStandings[`group-${i}`] = rr.groupStandings[i] || [];
                          }
                          
                          dispatch({ 
                            type: 'UPDATE_TOURNAMENT', 
                            payload: { 
                              ...currentTournament, 
                              winnersBracket, 
                              groups, 
                              roundRobinStandings 
                            } 
                          });
                        }}
                        disabled={currentGroupCount >= 8}
                      >+</button>
                    </div>
                  </div>
                );
              })()}

              {currentTournament.format === 'double-elim' && (
                <div className={styles.settingsSection}>
                  <div className={styles.sectionTitle}>
                    <h4>Grand Finals</h4>
                  </div>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={currentTournament.grandFinalsReset}
                      onChange={(e) => {
                        const updated = { ...currentTournament, grandFinalsReset: e.target.checked };
                        dispatch({ type: 'UPDATE_TOURNAMENT', payload: updated });
                      }}
                    />
                    <span>Enable Grand Finals Reset (if necessary)</span>
                  </label>
                </div>
              )}

              <div className={styles.settingsSection}>
                <div className={styles.sectionTitle}>
                  <h4>Team Seeds</h4>
                  {canEditSeeds() && !editSeeds && (
                    <Button size="sm" variant="secondary" onClick={() => setEditSeeds(true)}>Edit Seeds</Button>
                  )}
                  {editSeeds && (
                    <Button size="sm" variant="secondary" onClick={() => setEditSeeds(false)}>Done</Button>
                  )}
                </div>
                
                {editSeeds ? (
                  <div className={styles.seedEditor}>
                    <p className={styles.seedHint}>Drag teams to reorder seeds</p>
                    <div className={styles.seedList}>
                      {currentTournament.teams
                        .sort((a, b) => a.seed - b.seed)
                        .map((team) => (
                          <div
                            key={team.teamId}
                            className={`${styles.seedItem} ${draggedSeed === team.seed ? styles.dragging : ''}`}
                            draggable={canEditSeeds()}
                            onDragStart={(e) => handleDragStart(e, team.seed)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, team.seed)}
                          >
                            <span className={styles.dragHandle}>⋮⋮</span>
                            <span className={styles.seedNumber}>{team.seed}</span>
                            <span className={styles.seedTeamName}>{getTeamById(team.teamId)?.name || 'Unknown'}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.seedPreview}>
                    {currentTournament.teams
                      .sort((a, b) => a.seed - b.seed)
                      .slice(0, 4)
                      .map((team) => (
                        <span key={team.seed} className={styles.seedChip}>
                          {team.seed}. {getTeamById(team.teamId)?.tag || 'UNK'}
                        </span>
                      ))}
                    {currentTournament.teams.length > 4 && (
                      <span className={styles.seedMore}>+{currentTournament.teams.length - 4} more</span>
                    )}
                  </div>
                )}
                
                {!canEditSeeds() && !editSeeds && (
                  <p className={styles.seedWarning}>
                    Seeds cannot be changed once Round 1 matches have started
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {showAddTeamsModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAddTeamsModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h3>Edit Teams</h3>
              <p className="text-muted" style={{ marginBottom: '16px' }}>
                Click teams to add or remove them from the tournament.
                {currentTournament?.format === 'round-robin' && (currentTournament.groups?.length || 0) > 1 && ' Use the dropdowns to assign teams to groups.'}
              </p>
              
              <div className={styles.formField}>
                <label>Teams in Tournament ({currentTournament?.teams.length || 0})</label>
                <div className={styles.teamSelection}>
                  {currentTournament?.teams
                    .sort((a, b) => a.seed - b.seed)
                    .map(teamEntry => {
                      const team = getTeamById(teamEntry.teamId);
                      if (!team) return null;
                      
                      const currentGroup = currentTournament.groups?.find(g => 
                        currentTournament.roundRobinStandings[g.id]?.some(s => s.teamId === teamEntry.teamId)
                      );
                      const groupIndex = currentGroup ? currentTournament.groups?.indexOf(currentGroup) ?? 0 : 0;
                      
                      return (
                        <div 
                          key={teamEntry.teamId}
                          className={`${styles.teamSelectItem} ${styles.selected}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            {teamLogoUrls[team.id] ? (
                              <img src={teamLogoUrls[team.id]!} alt="" className={styles.teamLogo} />
                            ) : (
                              <div className={styles.teamLogo} />
                            )}
                            <span className={styles.teamName}>{team.name}</span>
                          </div>
                          {currentTournament?.format === 'round-robin' && (currentTournament.groups?.length || 0) > 1 && (
                            <select
                              className={styles.groupSelect}
                              value={groupIndex}
                              onChange={(e) => {
                                const newGroupIdx = parseInt(e.target.value);
                                const newTeamIds = currentTournament.teams.map(t => t.teamId);
                                const groupOverrides: Record<string, number> = {};
                                newTeamIds.forEach((tid, idx) => {
                                  if (tid === teamEntry.teamId) {
                                    groupOverrides[tid] = newGroupIdx;
                                  } else {
                                    const existingGroup = currentTournament.groups?.find(g => 
                                      currentTournament.roundRobinStandings[g.id]?.some(s => s.teamId === tid)
                                    );
                                    groupOverrides[tid] = existingGroup ? currentTournament.groups?.indexOf(existingGroup) ?? 0 : idx % (currentTournament.groups?.length || 1);
                                  }
                                });
                                handleUpdateTeams(newTeamIds, groupOverrides);
                              }}
                            >
                              {currentTournament.groups?.map((g, idx) => (
                                <option key={g.id} value={idx}>{g.name}</option>
                              ))}
                            </select>
                          )}
                          <span 
                            className={styles.removeTeam}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newTeamIds = currentTournament.teams
                                .filter(t => t.teamId !== teamEntry.teamId)
                                .map(t => t.teamId);
                              handleUpdateTeams(newTeamIds);
                            }}
                          >−</span>
                        </div>
                      );
                    })}
                  {currentTournament?.teams.length === 0 && (
                    <p className="text-muted">No teams in tournament</p>
                  )}
                </div>
              </div>

              <div className={styles.formField}>
                <label>Available Teams</label>
                <div className={styles.teamSelection}>
                  {teams
                    .filter(t => !currentTournament?.teams.some(ct => ct.teamId === t.id))
                    .map(team => (
                      <div 
                        key={team.id}
                        className={styles.teamSelectItem}
                        onClick={() => {
                          const newTeamIds = [...(currentTournament?.teams.map(t => t.teamId) || []), team.id];
                          handleUpdateTeams(newTeamIds);
                        }}
                      >
                        {teamLogoUrls[team.id] ? (
                          <img src={teamLogoUrls[team.id]!} alt="" className={styles.teamLogo} />
                        ) : (
                          <div className={styles.teamLogo} />
                        )}
                        <span className={styles.teamName}>{team.name}</span>
                        <span className={styles.addTeam}>+</span>
                      </div>
                    ))}
                  {teams.filter(t => !currentTournament?.teams.some(ct => ct.teamId === t.id)).length === 0 && (
                    <p className="text-muted">No more teams available</p>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <Button onClick={() => setShowAddTeamsModal(false)}>Done</Button>
              </div>
            </div>
          </div>
        )}

        {matchModal.match && (
          <div className={styles.modalOverlay} onClick={() => setMatchModal({ match: null, bracketType: 'winners' })}>
            <div className={styles.matchModal} onClick={e => e.stopPropagation()}>
              <div className={styles.matchModalHeader}>
                <h3>Match {matchModal.match.id}</h3>
                <span className={`${styles.statusBadge} ${styles[matchModal.match.status]}`}>
                  {matchModal.match.status}
                </span>
              </div>
              
              <div className={styles.formField}>
                <label>First To</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={matchModal.match.firstTo}
                  onChange={(e) => setMatchModal({
                    ...matchModal,
                    match: { ...matchModal.match, firstTo: parseInt(e.target.value) || 1 } as BracketMatch
                  })}
                  className={styles.numberInput}
                />
              </div>

              <div className={styles.matchModalTeams}>
                <div className={`${styles.modalTeam} ${matchModal.match.winnerId === matchModal.match.team1Id ? styles.winner : ''}`}>
                  <div className={styles.modalTeamInfo}>
                    <span className={styles.modalSeed}>{getSeed(matchModal.match.team1Id) || '-'}</span>
                    <span className={styles.modalName}>
                      {matchModal.match.team1Id ? getTeamById(matchModal.match.team1Id)?.name || 'Unknown' : 'TBD'}
                    </span>
                  </div>
                  <div className={styles.modalScoreControls}>
                    <button 
                      className={styles.scoreBtn}
                      onClick={() => {
                        const m = matchModal.match!;
                        setMatchModal({
                          ...matchModal,
                          match: { ...m, team1Score: Math.max(0, m.team1Score - 1) } as BracketMatch
                        });
                      }}
                      disabled={matchModal.match?.status === 'completed'}
                    >−</button>
                    <span className={styles.modalScore}>{matchModal.match?.team1Score}</span>
                    <button 
                      className={styles.scoreBtn}
                      onClick={() => {
                        const m = matchModal.match!;
                        setMatchModal({
                          ...matchModal,
                          match: { ...m, team1Score: m.team1Score + 1 } as BracketMatch
                        });
                      }}
                      disabled={matchModal.match?.status === 'completed'}
                    >+</button>
                  </div>
                </div>

                <div className={`${styles.modalTeam} ${matchModal.match.winnerId === matchModal.match.team2Id ? styles.winner : ''}`}>
                  <div className={styles.modalTeamInfo}>
                    <span className={styles.modalSeed}>{getSeed(matchModal.match.team2Id) || '-'}</span>
                    <span className={styles.modalName}>
                      {matchModal.match.team2Id ? getTeamById(matchModal.match.team2Id)?.name || 'Unknown' : 'TBD'}
                    </span>
                  </div>
                  <div className={styles.modalScoreControls}>
                    <button 
                      className={styles.scoreBtn}
                      onClick={() => {
                        const m = matchModal.match!;
                        setMatchModal({
                          ...matchModal,
                          match: { ...m, team2Score: Math.max(0, m.team2Score - 1) } as BracketMatch
                        });
                      }}
                      disabled={matchModal.match?.status === 'completed'}
                    >−</button>
                    <span className={styles.modalScore}>{matchModal.match?.team2Score}</span>
                    <button 
                      className={styles.scoreBtn}
                      onClick={() => {
                        const m = matchModal.match!;
                        setMatchModal({
                          ...matchModal,
                          match: { ...m, team2Score: m.team2Score + 1 } as BracketMatch
                        });
                      }}
                      disabled={matchModal.match?.status === 'completed'}
                    >+</button>
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                {matchModal.match.status !== 'completed' && matchModal.match.team1Id && matchModal.match.team2Id && (
                  <Button 
                    variant="primary"
                    onClick={() => {
                      setMatchModal({
                        ...matchModal,
                        match: { ...matchModal.match, status: 'completed' } as BracketMatch
                      });
                    }}
                  >
                    Mark Complete
                  </Button>
                )}
                {matchModal.match.status === 'completed' && (
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      if (!matchModal.match || !currentTournament) return;
                      
                      const match = matchModal.match;
                      
                      if (match.nextMatchId) {
                        const { match: nextMatch, bracketType: nextBracketType } = findMatchByIdAndType(match.nextMatchId);
                        if (nextMatch && nextMatch.status === 'completed') {
                          alert('Cannot reset match: the subsequent match is already complete. Please reset that match first.');
                          return;
                        }
                        
                        if (nextMatch && match.winnerId) {
                          const resetNextMatch = {
                            ...nextMatch,
                            [match.nextMatchSlot === 1 ? 'team1Id' : 'team2Id']: null
                          };
                          dispatch({ 
                            type: 'UPDATE_BRACKET_MATCH', 
                            payload: { tournamentId: currentTournament.id, match: resetNextMatch, bracketType: nextBracketType } 
                          });
                        }
                      }
                      
                      setMatchModal({
                        ...matchModal,
                        match: { 
                          ...matchModal.match, 
                          team1Score: 0,
                          team2Score: 0,
                          status: 'pending', 
                          winnerId: null 
                        } as BracketMatch
                      });
                    }}
                  >
                    Reset Match
                  </Button>
                )}
                <Button onClick={saveMatchModal}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Tournaments</h1>
        <Button onClick={() => setShowCreateModal(true)}>+ New Tournament</Button>
      </div>

      <div className={styles.content}>
        <div className={styles.tournamentGrid}>
          {tournaments.length === 0 ? (
            <div className={styles.empty}>
              <p className="text-muted">No tournaments yet. Create your first tournament!</p>
            </div>
          ) : (
            tournaments.map(t => (
              <div 
                key={t.id} 
                className={styles.tournamentCard}
                onClick={() => handleSelectTournament(t)}
              >
                <div className={styles.cardHeader}>
                  <h3>{t.name}</h3>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTournament(t.id); }}
                  >
                    ×
                  </Button>
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.formatBadge}>{t.format === 'single-elim' ? 'Single Elim' : t.format === 'double-elim' ? 'Double Elim' : 'Round Robin'}</span>
                  <span className={styles.teamCount}>{t.teams.length} teams</span>
                </div>
                <div className={styles.cardStatus}>
                  <span className={`${styles.statusBadge} ${styles[t.status]}`}>{t.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Create Tournament</h3>
            
            <Input 
              label="Tournament Name" 
              value={newTournament.name} 
              onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })} 
              placeholder="e.g., Winter Championship 2024"
              type="text"
              autoFocus
            />
            
            <div className={styles.formField}>
              <label>Format</label>
              <Select 
                value={newTournament.format} 
                onChange={(e) => setNewTournament({ ...newTournament, format: e.target.value as BracketFormat })}
                options={[
                  { value: 'single-elim', label: 'Single Elimination' },
                  { value: 'double-elim', label: 'Double Elimination' },
                  { value: 'round-robin', label: 'Round Robin' }
                ]}
              />
            </div>

            {newTournament.format === 'round-robin' && (
              <div className={styles.formField}>
                <label>Number of Groups</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={newTournament.numGroups}
                  onChange={(e) => setNewTournament({ ...newTournament, numGroups: Math.max(1, Math.min(8, parseInt(e.target.value) || 1)) })}
                  className={styles.numberInput}
                />
              </div>
            )}

            <div className={styles.formField}>
              <label>Default Match Format (First To)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={newTournament.firstTo}
                onChange={(e) => setNewTournament({ ...newTournament, firstTo: parseInt(e.target.value) || 3 })}
                className={styles.numberInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label>Select Teams ({selectedTeamIds.length} selected)</label>
              <div className={styles.teamSelection}>
                {teams.length === 0 ? (
                  <p className="text-muted">No teams available. Create teams first.</p>
                ) : (
                  teams.map(team => (
                    <div 
                      key={team.id}
                      className={`${styles.teamSelectItem} ${selectedTeamIds.includes(team.id) ? styles.selected : ''}`}
                      onClick={() => toggleTeamSelection(team.id)}
                    >
                      {teamLogoUrls[team.id] ? (
                        <img src={teamLogoUrls[team.id]!} alt="" className={styles.teamLogo} />
                      ) : (
                        <div className={styles.teamLogo} />
                      )}
                      <span className={styles.teamName}>{team.name}</span>
                      {selectedTeamIds.includes(team.id) && (
                        <input 
                          type="number" 
                          min={1} 
                          max={selectedTeamIds.length}
                          value={seeds[team.id] || selectedTeamIds.indexOf(team.id) + 1}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateSeed(team.id, parseInt(e.target.value) || 1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={styles.seedInput}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateTournament}
                disabled={!newTournament.name.trim() || selectedTeamIds.length < 2}
              >
                Create Tournament
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentView;
