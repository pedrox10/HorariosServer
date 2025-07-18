import {Entity, Column, PrimaryGeneratedColumn, BaseEntity, OneToMany} from "typeorm"

@Entity()
export class Licencia extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string;
}