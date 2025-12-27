import React from 'react';
import { 
  ShoppingBasket, Utensils, Zap, MoreHorizontal, 
  Droplets, Flame, Phone, TrainFront, 
  Shirt, Wrench, Soup, Hotel, Ticket, DollarSign,
  Package, Sparkles, HelpCircle, Coffee
} from 'lucide-react';

export interface CategoryItem {
  label: string;
  displayLabel: string;
  color: string;
  icon: React.ReactNode;
}

export interface CategoryGroup {
  name: string;
  items: CategoryItem[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: '日常购物',
    items: [
      { label: '菜篮子', displayLabel: '菜篮子', color: '#00C853', icon: <ShoppingBasket size={29} /> }, 
      { label: '干货调料', displayLabel: '干货', color: '#FF9100', icon: <Soup size={29} /> },       
      { label: '日用五金', displayLabel: '五金', color: '#607D8B', icon: <Wrench size={29} /> },       
      { label: '服饰', displayLabel: '服饰', color: '#FF4081', icon: <Shirt size={29} /> },         
      { label: '购物其他', displayLabel: '其他', color: '#00BFA5', icon: <Package size={29} /> },     
    ]
  },
  {
    name: '休闲娱乐',
    items: [
      { label: '餐饮', displayLabel: '餐饮', color: '#FF1744', icon: <Coffee size={29} /> },         
      { label: '交通', displayLabel: '交通', color: '#2979FF', icon: <TrainFront size={29} /> },     
      { label: '住宿', displayLabel: '住宿', color: '#3D5AFE', icon: <Hotel size={29} /> },          
      { label: '票务', displayLabel: '票务', color: '#FFD600', icon: <Ticket size={29} /> },         
      { label: '娱乐其他', displayLabel: '其他', color: '#D500F9', icon: <Sparkles size={29} /> },    
    ]
  },
  {
    name: '居家服务',
    items: [
      { label: '水', displayLabel: '水费', color: '#00B0FF', icon: <Droplets size={29} /> },         
      { label: '电', displayLabel: '电费', color: '#FFEA00', icon: <Zap size={29} /> },             
      { label: '燃', displayLabel: '燃气', color: '#FF3D00', icon: <Flame size={29} /> },          
      { label: '话', displayLabel: '话费', color: '#00E676', icon: <Phone size={29} /> },          
      { label: '服务其他', displayLabel: '其他', color: '#757575', icon: <HelpCircle size={29} /> },   
    ]
  },
  {
    name: '其他支出',
    items: [
      { label: '其他', displayLabel: '其他', color: '#212121', icon: <MoreHorizontal size={29} /> }, 
    ]
  }
];

export const INCOME_CATEGORY: CategoryItem = {
  label: '收入',
  displayLabel: '收入',
  color: '#00E676', 
  icon: <DollarSign size={29} />
};

export const CHART_COLORS = [
  '#FF1744', '#2979FF', '#00E676', '#FFEA00', '#D500F9',
  '#00B0FF', '#FF9100', '#FF4081', '#3D5AFE', '#00C853'
];