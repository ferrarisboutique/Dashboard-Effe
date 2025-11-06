import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface SalesChartProps {
  title: string;
  data: any[];
  type: 'bar' | 'line' | 'pie' | 'line-dual';
  dataKey: string;
  xAxisKey?: string;
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function SalesChart({ title, data, type, dataKey, xAxisKey = 'name', height = 300 }: SalesChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Vendite']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey={dataKey} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Vendite']}
                labelFormatter={(label) => `${label}`}
              />
              <Line type="monotone" dataKey={dataKey} stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'line-dual':
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const yearLabel = name === 'current' ? `${currentYear}` : `${previousYear}`;
                  return [`€${value.toLocaleString('it-IT')}`, `Anno ${yearLabel}`];
                }}
                labelFormatter={(label) => `${label}`} 
              />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#2563eb" 
                strokeWidth={2} 
                name={`Anno Corrente ${currentYear}`}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="previous" 
                stroke="#94a3b8" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name={`Anno Precedente ${previousYear}`}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Vendite']} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}