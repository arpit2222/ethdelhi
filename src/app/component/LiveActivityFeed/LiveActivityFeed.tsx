import React from 'react';

interface Activity {
  type: string;
  details: string;
  time: string;
}

interface LiveActivityFeedProps {
  activities: Activity[];
}

export default function LiveActivityFeed({ activities }: LiveActivityFeedProps): JSX.Element {
    return (
        <section className="py-20">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white">Live Market Activity</h2>
                <p className="text-gray-400 mt-2">See the platform in action with real-time events.</p>
            </div>
            <div className="max-w-3xl mx-auto bg-gray-800/50 rounded-xl border border-gray-700 p-2">
                <div className="space-y-2">
                     {activities.map((activity, index) => (
                         <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                             <div className="flex items-center">
                                 <span className={`mr-3 h-2 w-2 rounded-full ${
                                     activity.type.includes('Arbitrage') ? 'bg-emerald-500' :
                                     activity.type.includes('Deployment') ? 'bg-sky-500' :
                                     activity.type.includes('Profit') ? 'bg-amber-500' : 'bg-indigo-500'
                                 }`}></span>
                                 <div>
                                    <p className="text-sm font-semibold text-white">{activity.type}</p>
                                    <p className="text-xs text-gray-400">{activity.details}</p>
                                 </div>
                             </div>
                             <p className="text-xs text-gray-500">{activity.time}</p>
                         </div>
                     ))}
                </div>
            </div>
        </div>
    </section>
    )
}
