import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import type { User } from '../types';

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createUser(user: Partial<User>): Promise<User> {
  const { password, ...rest } = user;
  let hashedPassword = '';

  if (password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

  const { data, error } = await supabase
    .from('users')
    .insert([{ ...rest, password: hashedPassword }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User> {
  const { password, ...rest } = updates;
  const updateData: any = { ...rest };

  if (password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(password, salt);
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
