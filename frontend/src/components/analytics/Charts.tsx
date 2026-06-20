import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Box, Card, CardContent, Typography, useTheme, alpha } from '@mui/material';

import type { TimeSeriesData } from '../../types';

// Helper custom tooltip
const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
  const theme = useTheme();
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: theme.palette.background.paper,
          p: 1.5,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow: theme.shadows[3],
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {payload[0].value.toLocaleString()} {suffix}
        </Typography>
      </Box>
    );
  }
  return null;
};

// 1. Search Volume Chart (LineChart)
interface LineChartProps {
  data: TimeSeriesData[];
  title?: string;
}

export const SearchVolumeChart: React.FC<LineChartProps> = ({ data, title = 'Search Volume Trend' }) => {
  const theme = useTheme();

  return (
    <Card sx={{ height: 350, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip suffix="queries" />} />
              <Line
                type="monotone"
                dataKey="value"
                name="Searches"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

// 2. Knowledge Base Growth (AreaChart)
interface AreaChartProps {
  data: TimeSeriesData[];
  title?: string;
}

export const KnowledgeGrowthChart: React.FC<AreaChartProps> = ({ data, title = 'Knowledge Base Growth' }) => {
  const theme = useTheme();

  return (
    <Card sx={{ height: 350, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip suffix="documents" />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Total Documents"
                stroke={theme.palette.secondary.main}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#growthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

// 3. User Activity by Hour (BarChart)
interface BarChartProps {
  data: TimeSeriesData[];
  title?: string;
}

export const UserActivityChart: React.FC<BarChartProps> = ({ data, title = 'User Activity by Hour' }) => {
  const theme = useTheme();

  return (
    <Card sx={{ height: 350, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip suffix="active sessions" />} />
              <Bar
                dataKey="value"
                name="Active Users"
                fill={theme.palette.info.main}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

// 4. Document Types Distribution (PieChart)
interface PieChartItem {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieChartItem[];
  title?: string;
}

export const DocumentTypesDistributionChart: React.FC<PieChartProps> = ({
  data,
  title = 'Document Types Distribution',
}) => {
  const theme = useTheme();

  // Color options for sectors
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  return (
    <Card sx={{ height: 350, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
        <Box sx={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: 8,
                }}
                itemStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
              />
              <Legend
                verticalAlign="bottom"
                iconSize={10}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, pt: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
