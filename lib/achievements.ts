import { User, Camera, Mail, ShieldAlert, ShieldCheck, MessageSquare, Heart, Quote, Users, PenTool } from 'lucide-react'

const LADDER_STEPS = [1, 5, 10, 25, 50, 100, 1000, 10000]

const generateLadder = (metric: string, dateDictKey: string, titlePrefix: string, desc: string, icon: any) => {
  return LADDER_STEPS.map((step, index) => ({
    id: `${metric}_${step}`,
    title: `${titlePrefix} ${index + 1}`,
    description: `${desc} ${step} ${step === 1 ? 'time' : 'times'}.`,
    metric: metric,
    dateDictKey: dateDictKey,
    target: step,
    icon: icon,
  }))
}

export const ACHIEVEMENTS_CATALOG = [
  { id: 'avatar', title: 'Working on my likeability', description: 'Upload a profile avatar.', metric: 'has_avatar', exactDateField: null, target: 1, icon: User },
  { id: 'live_snap', title: 'Say Cheese!', description: 'Post a quote using a Live Snap.', metric: 'has_live_snap', exactDateField: 'live_snap_date', target: 1, icon: Camera },
  { id: 'invite', title: 'The Recruiter', description: 'Invite a friend by tagging their email in a post.', metric: 'has_tagged_email', exactDateField: 'tagged_email_date', target: 1, icon: Mail },
  { id: 'liar', title: 'LIAR!', description: 'Have at least 2 witnesses deny a single quote.', metric: 'has_disapproved', exactDateField: null, target: 1, icon: ShieldAlert },
  { id: 'truthteller', title: 'Truthteller', description: 'Have at least 2 witnesses approve a single quote.', metric: 'has_approved', exactDateField: null, target: 1, icon: ShieldCheck },
  
  ...generateLadder('quotes_count', 'quote_dates', 'Publisher Lvl', 'Post', PenTool),
  ...generateLadder('followers_count', 'follower_dates', 'Influencer Lvl', 'Gain a follower', Users),
  ...generateLadder('comments_count', 'comment_dates', 'Critic Lvl', 'Leave comments on unique publications', MessageSquare),
  ...generateLadder('reactions_count', 'reaction_dates', 'Vibe Checker Lvl', 'React to unique publications', Heart),
  ...generateLadder('quoted_me_count', 'quoted_me_dates', 'Muse Lvl', 'Get quoted', Quote),
]

export const calculateUnlockedCount = (stats: Record<string, any> | null) => {
  if (!stats) return 0
  return ACHIEVEMENTS_CATALOG.filter(ach => (stats[ach.metric] || 0) >= ach.target).length
}