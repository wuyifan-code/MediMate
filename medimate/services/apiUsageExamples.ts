// API调用示例代码文件
// 此文件展示如何在实际组件中使用apiService进行API调用

import { apiService } from './apiService';
import { UserRole } from '../types';

/**
 * 用户登录示例
 * @param email 用户邮箱
 * @param password 用户密码
 * @param role 用户角色
 */
export const loginExample = async (email: string, password: string, role: UserRole) => {
  try {
    // 显示加载状态
    console.log('正在登录...');
    
    // 调用登录API
    const result = await apiService.login({ email, password, role });
    
    console.log('登录成功:', result);
    
    // 获取用户信息
    const userInfo = apiService.getUser();
    console.log('当前用户:', userInfo);
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: error.message || '登录失败，请检查您的邮箱和密码'
    };
  }
};

/**
 * 用户注册示例
 * @param name 用户姓名
 * @param email 用户邮箱
 * @param password 用户密码
 * @param phone 电话号码
 * @param role 用户角色
 */
export const registerExample = async (
  name: string,
  email: string,
  password: string,
  phone: string,
  role: UserRole
) => {
  try {
    console.log('正在注册...');
    
    const result = await apiService.register({
      name,
      email,
      password,
      phone,
      role
    });
    
    console.log('注册成功:', result);
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('注册失败:', error);
    return {
      success: false,
      error: error.message || '注册失败，请稍后重试'
    };
  }
};

/**
 * 获取医院列表示例
 * @param page 页码
 * @param limit 每页数量
 */
export const fetchHospitalsExample = async (page: number = 1, limit: number = 10) => {
  try {
    // 检查用户是否已登录
    if (!apiService.isLoggedIn()) {
      console.warn('用户未登录，可能无法获取完整数据');
    }
    
    console.log('正在获取医院列表...');
    
    // 调用API获取医院列表
    const hospitals = await apiService.getHospitals({ page, limit });
    
    console.log(`获取到 ${hospitals.length} 家医院`);
    
    return hospitals;
  } catch (error) {
    console.error('获取医院列表失败:', error);
    return [];
  }
};

/**
 * 获取附近陪诊师示例
 * @param latitude 纬度
 * @param longitude 经度
 * @param radius 搜索半径(公里)
 */
export const fetchNearbyEscortsExample = async (
  latitude: number,
  longitude: number,
  radius: number = 5
) => {
  try {
    console.log(`正在搜索${radius}公里范围内的陪诊师...`);
    
    const escorts = await apiService.getNearbyEscorts(latitude, longitude, radius);
    
    console.log(`找到 ${escorts.length} 位附近的陪诊师`);
    
    return escorts;
  } catch (error) {
    console.error('获取附近陪诊师失败:', error);
    return [];
  }
};

/**
 * 创建预约示例
 * @param appointmentData 预约数据
 */
export const createAppointmentExample = async (appointmentData: any) => {
  try {
    // 检查用户是否已登录
    if (!apiService.isLoggedIn()) {
      throw new Error('请先登录再预约');
    }
    
    console.log('正在创建预约...');
    
    const appointment = await apiService.createAppointment(appointmentData);
    
    console.log('预约创建成功:', appointment);
    
    return {
      success: true,
      data: appointment
    };
  } catch (error: any) {
    console.error('创建预约失败:', error);
    return {
      success: false,
      error: error.message || '创建预约失败，请稍后重试'
    };
  }
};

/**
 * 获取用户预约列表示例
 */
export const fetchUserAppointmentsExample = async () => {
  try {
    // 检查用户是否已登录
    if (!apiService.isLoggedIn()) {
      throw new Error('请先登录查看预约');
    }
    
    console.log('正在获取用户预约...');
    
    const appointments = await apiService.getUserAppointments();
    
    console.log(`获取到 ${appointments.length} 条预约记录`);
    
    return appointments;
  } catch (error: any) {
    console.error('获取用户预约失败:', error);
    return [];
  }
};

/**
 * 用户登出示例
 */
export const logoutExample = () => {
  try {
    // 调用登出方法
    apiService.logout();
    
    // 验证是否已登出
    const isLoggedIn = apiService.isLoggedIn();
    
    console.log('登出状态:', isLoggedIn ? '未成功登出' : '已成功登出');
    
    return {
      success: !isLoggedIn
    };
  } catch (error) {
    console.error('登出失败:', error);
    return {
      success: false,
      error: '登出失败'
    };
  }
};

/**
 * 在React组件中的使用示例
 * 注意：此示例仅用于说明，不能直接运行
 */

/*
  // 在React组件中使用的示例代码
  import React, { useState, useEffect } from 'react';
  import { loginExample, fetchHospitalsExample } from '../services/apiUsageExamples';
  
  const LoginComponent = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole.PATIENT>('patient');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      
      const result = await loginExample(email, password, role);
      
      if (result.success) {
        // 登录成功，进行页面跳转或其他操作
        console.log('登录成功');
      } else {
        // 登录失败，显示错误信息
        setError(result.error || '登录失败');
      }
      
      setLoading(false);
    };
    
    return (
      <form onSubmit={handleSubmit}>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="邮箱"
          required
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="密码"
          required
        />
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          <option value="patient">患者</option>
          <option value="escort">陪诊师</option>
        </select>
        
        <button type="submit" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
        
        {error && <div className="error-message">{error}</div>}
      </form>
    );
  };
  
  const HospitalListComponent = () => {
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
      const loadHospitals = async () => {
        setLoading(true);
        setError('');
        
        try {
          const data = await fetchHospitalsExample();
          setHospitals(data);
        } catch (err: any) {
          setError(err.message || '获取医院列表失败');
        } finally {
          setLoading(false);
        }
      };
      
      loadHospitals();
    }, []);
    
    if (loading) return <div>加载中...</div>;
    if (error) return <div>错误: {error}</div>;
    
    return (
      <div className="hospital-list">
        <h2>医院列表</h2>
        {hospitals.map(hospital => (
          <div key={hospital.id} className="hospital-card">
            <h3>{hospital.name}</h3>
            <p>地址: {hospital.address}</p>
            <p>电话: {hospital.phone}</p>
          </div>
        ))}
      </div>
    );
  };
*/
