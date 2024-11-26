import {Entity, Column, PrimaryGeneratedColumn, BaseEntity} from "typeorm"

@Entity()
export class Terminal extends BaseEntity {
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    nombre:string
    @Column()
    ip:string
    @Column()
    puerto: number
    @Column({type: 'datetime', nullable: true})
    ult_sincronizacion: Date;
}