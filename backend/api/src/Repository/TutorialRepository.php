<?php

namespace App\Repository;

use App\Entity\Tutorial;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Tutorial>
 */
class TutorialRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Tutorial::class);
    }

    /**
     * @return Tutorial[]
     */
    public function searchByTitle(?string $title): array
    {
        $qb = $this->createQueryBuilder('t');
        if ($title) {
            $qb->andWhere('LOWER(t.title) LIKE LOWER(:title)')
                ->setParameter('title', '%' . $title . '%');
        }
        return $qb->orderBy('t.id', 'ASC')->getQuery()->getResult();
    }
}
