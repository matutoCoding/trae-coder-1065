import type { Coach } from '@/types';

export const coaches: Coach[] = [
  {
    id: 'coach_001',
    name: '李教练',
    avatar: 'https://picsum.photos/id/64/200/200',
    level: '国家级教练',
    experience: 12,
    pricePerHour: 200,
    rating: 4.9,
    specialties: ['发球训练', '底线对拉', '战术指导'],
    available: true,
    description: '前国家队队员，擅长成人高级训练和战术指导，教学经验丰富'
  },
  {
    id: 'coach_002',
    name: '陈教练',
    avatar: 'https://picsum.photos/id/91/200/200',
    level: '省队级教练',
    experience: 8,
    pricePerHour: 150,
    rating: 4.8,
    specialties: ['基础入门', '青少年培训', '步法训练'],
    available: true,
    description: '擅长青少年网球启蒙，教学耐心细致，学员通过率高'
  },
  {
    id: 'coach_003',
    name: '孙教练',
    avatar: 'https://picsum.photos/id/177/200/200',
    level: '专业教练',
    experience: 6,
    pricePerHour: 120,
    rating: 4.7,
    specialties: ['儿童培训', '入门教学', '趣味训练'],
    available: true,
    description: '专注儿童网球教育，课堂生动有趣，深受小朋友喜爱'
  },
  {
    id: 'coach_004',
    name: '王教练',
    avatar: 'https://picsum.photos/id/338/200/200',
    level: '国家级教练',
    experience: 15,
    pricePerHour: 250,
    rating: 5.0,
    specialties: ['竞技提升', '比赛备战', '体能训练'],
    available: false,
    description: 'ITF认证教练，培养过多名省级冠军，适合竞技选手'
  },
  {
    id: 'coach_005',
    name: '张教练',
    avatar: 'https://picsum.photos/id/1027/200/200',
    level: '省队级教练',
    experience: 10,
    pricePerHour: 180,
    rating: 4.8,
    specialties: ['双打战术', '网前技术', '心理辅导'],
    available: true,
    description: '双打选手出身，擅长网前技术和双打战术配合'
  }
];

export const getAvailableCoaches = (): Coach[] => {
  return coaches.filter((c) => c.available);
};

export const getCoachById = (id: string): Coach | undefined => {
  return coaches.find((c) => c.id === id);
};
