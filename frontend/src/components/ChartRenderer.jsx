import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function ChartRenderer({ chart, data }) {
  if (!chart || !chart.type) {
    return null;
  }

  // Normalize fields from LLM which might use x_field/y_field and string for y_field
  const xKey = chart.x || chart.x_field;
  let yKeys = chart.y || chart.y_field || [];
  if (typeof yKeys === 'string') {
    yKeys = [yKeys];
  }

  // Common wrapper for responsive container
  const ChartContainer = ({ children }) => (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );

  switch (chart.type) {
    case 'bar':
      return (
        <ChartContainer>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', color: '#e4e4e7', borderRadius: '8px', border: '1px solid #3f3f46', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            {yKeys && yKeys.map((yKey, index) => (
              <Bar key={yKey} dataKey={yKey} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ChartContainer>
      );

    case 'line':
      return (
        <ChartContainer>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', color: '#e4e4e7', borderRadius: '8px', border: '1px solid #3f3f46', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            {yKeys && yKeys.map((yKey, index) => (
              <Line 
                key={yKey} 
                type="monotone" 
                dataKey={yKey} 
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS[index % COLORS.length], strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      );

    case 'pie':
      return (
        <ChartContainer>
          <PieChart>
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', color: '#e4e4e7', borderRadius: '8px', border: '1px solid #3f3f46', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={60}
              paddingAngle={2}
              fill="#8884d8"
              label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      );

    case 'single_value':
      if (data && data.length === 1) {
        const row = data[0];
        const keys = Object.keys(row);
        let displayValue = '';
        
        if (keys.length === 1) {
          displayValue = row[keys[0]];
        } else if (keys.length === 2) {
          displayValue = `[${row[keys[0]]}]: ${row[keys[1]]}`;
        } else {
          displayValue = row[keys[0]];
        }
        
        return (
          <div className="mt-4 py-12 px-6 bg-accent-950/30 rounded-xl border border-accent-900/50 flex flex-col items-center justify-center w-full">
            <span className="text-sm font-medium text-accent-400/80 uppercase tracking-wider mb-3 text-center">
              {chart.title || 'Result'}
            </span>
            <span className="text-[56px] leading-tight font-bold text-accent-100 text-center">
              {displayValue}
            </span>
          </div>
        );
      }
      return null;

    case 'table':
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        return (
          <div className="mt-4 overflow-x-auto border border-zinc-800 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-zinc-800/50 uppercase tracking-wider">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-6 py-3 font-medium whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="px-6 py-3 whitespace-nowrap text-zinc-300">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return null;

    default:
      return null;
  }
}
