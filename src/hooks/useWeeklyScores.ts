import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DailyScore } from '@/types';
import { useAuth } from '@/context/authContext';

export function useWeeklyScores() {
    const { user } = useAuth();
    const [scores, setScores] = useState<DailyScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWeeklyScores = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Calculate date range (last 7 days including today)
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);

            const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
            const endDateStr = today.toISOString().split('T')[0];

            const { data, error: fetchError } = await supabase
                .from('daily_scores')
                .select('*')
                .eq('user_id', user.id)
                .gte('plan_date', startDateStr)
                .lte('plan_date', endDateStr)
                .order('plan_date', { ascending: true });

            if (fetchError) throw fetchError;

            setScores(data || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching weekly scores:', err);
            setError(err.message || 'Erro ao carregar scores semanais');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeeklyScores();
    }, [user?.id]);

    // Average consistency and adherence for the week
    const weeklyAverage = scores.length > 0
        ? {
            consistency: scores.reduce((acc, s) => acc + Number(s.consistency_score), 0) / scores.length,
            adherence: scores.reduce((acc, s) => acc + Number(s.adherence_score), 0) / scores.length,
            final: scores.reduce((acc, s) => acc + Number(s.weighted_final_score), 0) / scores.length,
        }
        : { consistency: 0, adherence: 0, final: 0 };

    return {
        scores,
        loading,
        error,
        weeklyAverage,
        refresh: fetchWeeklyScores
    };
}
