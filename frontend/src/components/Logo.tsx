import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <img 
      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCv1TDYSLttBij_FIP4N4RvoSujGwsluyJRcobJz8SzDv4Oj5J5NwZGo0tv5x9hpND5J4GuxvbxLbopg96dzEVJJ7EPRczhdTRtORxSY-5zKGeGSMoYkvFWRqICMmIfNBx4PWAJ7di7Jjvm_rD5lqNCnRgijsS_-64-CiE51EKlRZuWSOH4D_wDtEcpWIr2kmChmTotPpOfcK7svL7op5XEbhfuGoqwzm6IWKVA_SUxtR4ryjYR8oNm0BBeJg9XbhkRGfM" 
      alt="Maybe Later Logo" 
      className={`object-cover ${className}`}
    />
  );
};
